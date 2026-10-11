/**
 * main.js —— 纯手机版入口，不依赖电脑。
 *
 * 一台手机全包：定时巡检 → 各平台取实付款 → 本地存快照 →
 * 判定命中后自动锁单 → Server酱推送到你微信 → 你手动付款。
 *
 * 使用：改 config.js 里的商品清单和 SendKey，然后运行本文件并保持常驻。
 * 建议在 AutoX.js 设置里开启“前台服务”，并给 AutoX.js 关掉电池优化。
 */

var config = require("./config.js");
var storage = require("./storage.js");
var judge = require("./judge.js");
var common = require("./common.js");

var RUNNERS = {
    taobao: require("./taobao.js"),
    jd: require("./jd.js")
};

auto.waitFor();
console.show();

// 风控冷却：platform -> 解除时间戳（内存态，脚本重启清零）
var captchaCooldown = {};

toastLog("price-bot 已启动，共 " + config.groups.length + " 组商品");

// 主循环：每分钟醒来一次，到点且在运行时段内才巡检
var lastRound = 0;
while (true) {
    if (Date.now() - lastRound >= config.intervalHours * 3600000
        && inRunWindow()) {
        lastRound = Date.now();
        try {
            prepareScreen();
            runRound();
        } catch (e) {
            log("巡检异常: %s", e);
        } finally {
            releaseScreen();
        }
    }
    sleep(60000);
}

// 当前时刻是否在允许的运行时段内（支持跨天，如 [23, 7]）
function inRunWindow() {
    var w = config.runWindow || [];
    if (w.length !== 2) return true;
    var h = new Date().getHours();
    return w[0] <= w[1] ? (h >= w[0] && h < w[1])
                        : (h >= w[0] || h < w[1]);
}

// 巡检前：点亮屏幕 + 上滑解锁（要求无锁屏密码）+ 巡检期间保持亮屏
function prepareScreen() {
    try {
        device.wakeUpIfNeeded();
        sleep(1500);
        // 无密码锁屏界面上滑即解锁；有密码这里会失败 → 巡检失败并推送
        swipe(device.width / 2, device.height * 0.8,
              device.width / 2, device.height * 0.2, 500);
        sleep(1500);
        device.keepScreenOn(3600 * 1000);
    } catch (e) {
        log("亮屏失败: %s", e);
    }
}

// 巡检后：取消保持亮屏，由系统息屏时间自动息屏（建议系统息屏设 15~30 秒）
function releaseScreen() {
    try {
        device.cancelKeepingAwake();
    } catch (e) {}
}

// ---------- 一轮巡检 ----------

function runRound() {
    log("=== 开始一轮巡检 ===");
    var platforms;

    // 1. 取价：所有组 × 所有平台
    config.groups.forEach(function (group) {
        platforms = Object.keys(group.items);
        platforms.forEach(function (platform) {
            if (Date.now() < (captchaCooldown[platform] || 0)) {
                log("跳过 %s（%s 风控冷却中）", group.name, platform);
                return;
            }
            var item = group.items[platform];
            var task = { url: item.url, sku: item.sku || [] };
            log("取价 %s @ %s", group.name, platform);

            var result = RUNNERS[platform].run(task, "probe");
            handleResult(group, platform, result);

            // 拟人间隔
            var gap = config.gapBetweenItems;
            common.sleepR(gap[0], gap[1]);
        });
    });

    // 2. 判定 + 锁单
    config.groups.forEach(function (group) {
        var d = judge.evaluate(group, config);
        log("判定 %s: hit=%s | %s", group.name, d.hit, d.reason);
        if (!d.hit) return;

        if (config.dryRun) {
            // 试运行：只推送，不锁单
            push("命中低价（试运行未锁单）：" + group.name,
                d.best.platform + " 实付 ¥" + d.best.price + "，" + d.reason + "\n" +
                "确认取数准确后，把 config.js 里 dryRun 改成 false 即可开启自动锁单。");
            return;
        }

        push("发现低价：" + group.name,
            d.best.platform + " 实付 ¥" + d.best.price + "，" + d.reason + "\n正在自动锁单…");

        var item = group.items[d.best.platform];
        var result = RUNNERS[d.best.platform].run(
            { url: item.url, sku: item.sku || [] }, "submit");

        if (result.status === "ok") {
            storage.addOrder(group.id, d.best.platform, result.price, "locked", d.reason);
            push("已锁单，等你付款：" + group.name,
                "实付 ¥" + result.price + "（" + d.best.platform + "）\n" +
                "请尽快打开 App「待付款」完成支付，超时订单会自动取消。");
        } else if (result.status === "captcha") {
            storage.addOrder(group.id, d.best.platform, null, "failed", "锁单触发风控");
            push("锁单触发风控", group.name + " 提交订单时出现验证，请手动去 App 下单。");
        } else {
            storage.addOrder(group.id, d.best.platform, null, "failed", result.error);
            push("锁单失败：" + group.name, result.error || "未知原因，请手动检查。");
        }
    });

    log("=== 本轮巡检结束 ===");
}

// ---------- 结果处理 ----------

function handleResult(group, platform, result) {
    if (result.status === "ok" && result.price) {
        storage.addSnapshot(group.id, platform, result.price);
        log("¥%s %s @ %s", result.price, group.name, platform);
    } else if (result.status === "captcha") {
        captchaCooldown[platform] =
            Date.now() + config.captchaCooldownHours * 3600000;
        push("比价脚本触发风控",
            group.name + " 的 " + platform + " 出现验证，已暂停该平台 " +
            config.captchaCooldownHours + " 小时");
    } else {
        push("取价失败：" + group.name, platform + "：" + (result.error || "未知"));
    }
}

// ---------- 推送 ----------

function push(title, content) {
    toastLog(title);
    if (!config.serverchanSendkey) return;
    try {
        http.get("https://sctapi.ftqq.com/" + config.serverchanSendkey + ".send"
            + "?title=" + encodeURIComponent(title.slice(0, 32))
            + "&desp=" + encodeURIComponent(content || ""), { timeout: 10000 });
    } catch (e) {
        log("推送失败: %s", e);
    }
}
