/**
 * judge.js —— 判定引擎：全网最低 + 近 N 天最低 + 心理价位 + 异常价保护。
 */
var storage = require("./storage.js");

function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * 返回 { hit: bool, best: {platform, price}|null, reason: string }
 */
function evaluate(group, cfg) {
    var j = cfg.judge;
    var platforms = Object.keys(group.items);

    // 1. 本轮报价（取价刚跑完，60 分钟内都算同一轮）
    var offers = storage.latestOffers(group.id, platforms, 60 * 60000);
    if (Object.keys(offers).length < platforms.length) {
        return { hit: false, best: null,
                 reason: "报价不齐：" + Object.keys(offers).join(",") };
    }

    var bestPlatform = platforms.reduce(function (a, b) {
        return offers[a] <= offers[b] ? a : b;
    });
    var bestPrice = offers[bestPlatform];

    // 2. 异常价保护
    var hist = storage.recentPrices(group.id, 10);
    if (hist.length >= 5) {
        var med = median(hist);
        if (bestPrice < med * j.sanityRatio) {
            return { hit: false, best: null,
                     reason: "异常低价 ¥" + bestPrice + "（中位 ¥" + med + "），疑似取数错误" };
        }
    }

    // 3. 冷却期
    var lastLocked = storage.lastLockedTs(group.id);
    if (lastLocked && Date.now() - lastLocked < j.cooldownHours * 3600000) {
        return { hit: false, best: null, reason: "冷却期内" };
    }

    // 4. 近 N 天最低
    var since = Date.now() - j.windowDays * 86400000;
    var histMin = storage.minPriceSince(group.id, since);
    if (histMin !== null && bestPrice > histMin) {
        return { hit: false, best: { platform: bestPlatform, price: bestPrice },
                 reason: "非近期最低（近" + j.windowDays + "天最低 ¥" + histMin + "）" };
    }

    // 5. 心理价位（可选）
    if (group.targetPrice && bestPrice > group.targetPrice) {
        return { hit: false, best: { platform: bestPlatform, price: bestPrice },
                 reason: "高于心理价位 ¥" + group.targetPrice };
    }

    var note = histMin === null
        ? "暂无历史基线，按当前全网最低处理"
        : "刷新近" + j.windowDays + "天最低（原 ¥" + histMin + "）";
    return { hit: true, best: { platform: bestPlatform, price: bestPrice }, reason: note };
}

module.exports = { evaluate: evaluate };
