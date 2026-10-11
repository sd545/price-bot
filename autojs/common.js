/**
 * common.js —— 通用自动化原语：拟人延时、点按、等待、金额提取、风控检测。
 * 推荐运行在 AutoX.js（Auto.js 开源续作）上。
 */

function sleepR(minMs, maxMs) {
    sleep(minMs + Math.random() * (maxMs - minMs));
}

/** 等待任一文本出现，返回找到的文本；超时返回 null */
function waitAny(texts, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    var end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        for (var i = 0; i < texts.length; i++) {
            if (textContains(texts[i]).exists() || text(texts[i]).exists()
                || desc(texts[i]).exists()) {
                return texts[i];
            }
        }
        sleep(400);
    }
    return null;
}

/** 点击包含指定文本的第一个可见控件。可传入 scrollFn 在找不到时滚动重试。 */
function tapText(t, opts) {
    opts = opts || {};
    var tries = opts.tries || 1;
    for (var i = 0; i < tries; i++) {
        var sel = textContains(t).clickable(true);
        var node = sel.findOne(1500) || textContains(t).findOne(1000);
        if (node) {
            var target = node.clickable() ? node : node.parent();
            if (target && target.click()) {
                sleepR(800, 1500);
                return true;
            }
            // 兜底：坐标点击
            var b = node.bounds();
            click(b.centerX(), b.centerY());
            sleepR(800, 1500);
            return true;
        }
        if (opts.scroll) {
            scrollDown();
            sleepR(600, 1000);
        }
    }
    return false;
}

/** 检测风控/验证码页面 */
function detectCaptcha(markers) {
    for (var i = 0; i < markers.length; i++) {
        if (textContains(markers[i]).exists()) return true;
    }
    return false;
}

/** 打开电商链接：优先 scheme 唤起 App，失败则用系统浏览器跳转 */
function openProduct(url, schemePrefix) {
    var schemeUrl = schemePrefix ? url.replace(/^https?:\/\//, schemePrefix) : url;
    try {
        app.startActivity({
            action: "android.intent.action.VIEW",
            data: schemeUrl
        });
    } catch (e) {
        app.startActivity({
            action: "android.intent.action.VIEW",
            data: url
        });
    }
    sleepR(3000, 5000);
}

var PRICE_RE = /[¥￥]?\s*(\d{1,6}(?:\.\d{1,2})?)/;

/** 从某个标签控件附近提取金额（¥xx.xx）。 */
function extractAmountNear(labels) {
    for (var i = 0; i < labels.length; i++) {
        var label = textContains(labels[i]).findOne(1500);
        if (!label) continue;
        // 策略1：父容器子树内找 ¥ 金额
        var price = searchAmountInSubtree(label.parent());
        if (price) return price;
        // 策略2：同一行右侧兄弟节点
        var p = label.parent();
        if (p) {
            for (var c = 0; c < p.childCount(); c++) {
                var child = p.child(c);
                if (child && child.text()) {
                    var m = child.text().match(PRICE_RE);
                    if (m) return parseFloat(m[1]);
                }
            }
        }
    }
    return null;
}

function searchAmountInSubtree(node) {
    if (!node) return null;
    var txt = node.text ? node.text() : null;
    if (txt) {
        var m = txt.match(/[¥￥]\s*(\d{1,6}(?:\.\d{1,2})?)/);
        if (m) return parseFloat(m[1]);
    }
    for (var i = 0; i < node.childCount(); i++) {
        var r = searchAmountInSubtree(node.child(i));
        if (r) return r;
    }
    return null;
}

/** 取价完成后退出：连按返回，顺手处理“放弃订单”类弹窗 */
function exitFlow(discardButtons, maxBack) {
    for (var i = 0; i < (maxBack || 4); i++) {
        back();
        sleepR(800, 1400);
        for (var j = 0; j < discardButtons.length; j++) {
            if (textContains(discardButtons[j]).exists()) {
                tapText(discardButtons[j]);
            }
        }
    }
}

module.exports = {
    sleepR: sleepR,
    waitAny: waitAny,
    tapText: tapText,
    detectCaptcha: detectCaptcha,
    openProduct: openProduct,
    extractAmountNear: extractAmountNear,
    exitFlow: exitFlow
};
