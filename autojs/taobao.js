/**
 * taobao.js —— 淘宝/天猫：打开商品 → 领券 → 选 SKU → 确认订单页取实付款。
 * mode = "probe"：只取价，不提交订单
 * mode = "submit"：取价后点击“提交订单”锁单（不付款）
 *
 * 返回 { status: "ok"|"captcha"|"failed", price, error }
 */
var common = require("./common.js");
var SELECTORS = require("./selectors.js");
var S = SELECTORS.taobao;

function run(task, mode) {
    try {
        common.openProduct(task.url, "taobao://");

        if (!common.waitAny(S.detailMarkers, 20000)) {
            return { status: "failed", error: "详情页未加载（可能是链接失效或需登录）" };
        }
        if (common.detectCaptcha(S.captchaMarkers)) {
            return { status: "captcha" };
        }

        // 1. 领券：打开领券面板，把能领的都点了
        if (common.tapText(S.couponEntry[0], { tries: 2 })) {
            common.waitAny(S.couponButtons.concat(S.couponClose), 8000);
            for (var i = 0; i < 6; i++) {
                var clicked = false;
                for (var j = 0; j < S.couponButtons.length; j++) {
                    if (common.tapText(S.couponButtons[j], { tries: 1 })) clicked = true;
                }
                if (!clicked) break;
            }
            for (var k = 0; k < S.couponClose.length; k++) {
                if (common.tapText(S.couponClose[k], { tries: 1 })) break;
            }
            back();
            common.sleepR(800, 1500);
        }

        // 2. 进入购买（弹出 SKU 面板）
        var opened = false;
        for (var b = 0; b < S.buyButtons.length; b++) {
            if (common.tapText(S.buyButtons[b], { tries: 2 })) { opened = true; break; }
        }
        if (!opened) return { status: "failed", error: "找不到购买按钮" };

        // 3. 选 SKU：按清单依次点规格文字
        for (var s = 0; s < task.sku.length; s++) {
            if (!common.tapText(task.sku[s], { tries: 3, scroll: true })) {
                return { status: "failed", error: "找不到规格：" + task.sku[s] };
            }
        }

        // 4. 确认 SKU 面板 → 确认订单页
        for (var c = 0; c < S.skuConfirm.length; c++) {
            if (common.tapText(S.skuConfirm[c], { tries: 2 })) break;
        }
        if (!common.waitAny(S.confirmMarkers, 20000)) {
            return { status: "failed", error: "未到达确认订单页" };
        }
        if (common.detectCaptcha(S.captchaMarkers)) {
            return { status: "captcha" };
        }

        // 5. 读取实付款
        var price = common.extractAmountNear(S.priceLabels);
        if (!price) return { status: "failed", error: "未能解析实付款金额" };

        // 6. probe 模式到此为止，退出；submit 模式点击提交订单锁单
        if (mode === "probe") {
            common.exitFlow(S.discardButtons, 4);
            return { status: "ok", price: price };
        }

        for (var sb = 0; sb < S.submitButtons.length; sb++) {
            if (common.tapText(S.submitButtons[sb], { tries: 2 })) break;
        }
        if (!common.waitAny(S.submitOkMarkers, 15000)) {
            if (common.detectCaptcha(S.captchaMarkers)) return { status: "captcha" };
            return { status: "failed", error: "提交后未见到收银台/待付款页" };
        }
        // 停留在待付款页，等用户手动支付；脚本退出
        return { status: "ok", price: price };

    } catch (e) {
        return { status: "failed", error: String(e) };
    }
}

module.exports = { run: run };
