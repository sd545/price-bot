/**
 * jd.js —— 京东：打开商品 → 领券 → 选 SKU → 确认订单页取实付款。
 * 结构与 taobao.js 一致，文案走 selectors.js 的 jd 段。
 *
 * 返回 { status: "ok"|"captcha"|"failed", price, error }
 */
var common = require("./common.js");
var SELECTORS = require("./selectors.js");
var S = SELECTORS.jd;

function run(task, mode) {
    try {
        // 京东 Universal Link，系统会唤起京东 App
        common.openProduct(task.url, null);

        if (!common.waitAny(S.detailMarkers, 20000)) {
            return { status: "failed", error: "详情页未加载（可能是链接失效或需登录）" };
        }
        if (common.detectCaptcha(S.captchaMarkers)) {
            return { status: "captcha" };
        }

        // 1. 领券（京东详情页“领券”通常在优惠一栏）
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

        // 2. 立即购买 → SKU 面板
        var opened = false;
        for (var b = 0; b < S.buyButtons.length; b++) {
            if (common.tapText(S.buyButtons[b], { tries: 2 })) { opened = true; break; }
        }
        if (!opened) return { status: "failed", error: "找不到购买按钮" };

        // 3. 选 SKU
        for (var s = 0; s < task.sku.length; s++) {
            if (!common.tapText(task.sku[s], { tries: 3, scroll: true })) {
                return { status: "failed", error: "找不到规格：" + task.sku[s] };
            }
        }
        for (var c = 0; c < S.skuConfirm.length; c++) {
            if (common.tapText(S.skuConfirm[c], { tries: 2 })) break;
        }

        // 4. 确认订单页
        if (!common.waitAny(S.confirmMarkers, 20000)) {
            return { status: "failed", error: "未到达确认订单页" };
        }
        if (common.detectCaptcha(S.captchaMarkers)) {
            return { status: "captcha" };
        }

        // 5. 实付款
        var price = common.extractAmountNear(S.priceLabels);
        if (!price) return { status: "failed", error: "未能解析实付款金额" };

        if (mode === "probe") {
            common.exitFlow(S.discardButtons, 4);
            return { status: "ok", price: price };
        }

        // 6. 提交订单（京东自营可能默认货到付款/在线支付，以页面为准，不代付）
        for (var sb = 0; sb < S.submitButtons.length; sb++) {
            if (common.tapText(S.submitButtons[sb], { tries: 2 })) break;
        }
        if (!common.waitAny(S.submitOkMarkers, 15000)) {
            if (common.detectCaptcha(S.captchaMarkers)) return { status: "captcha" };
            return { status: "failed", error: "提交后未见到收银台/待付款页" };
        }
        return { status: "ok", price: price };

    } catch (e) {
        return { status: "failed", error: String(e) };
    }
}

module.exports = { run: run };
