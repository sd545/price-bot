/**
 * selectors.js —— 各平台界面文案/控件配置。
 * App 大版本更新后脚本失灵，90% 的情况只需要改这里。
 * 用 AutoX.js 的“布局分析”功能查看当前页面的真实控件文本。
 */
var SELECTORS = {
    taobao: {
        packageName: "com.taobao.taobao",
        // 详情页特征（出现任一即认为详情页加载完成）
        detailMarkers: ["领券", "立即购买", "加入购物车", "马上抢"],
        // 领券入口与面板
        couponEntry: ["领券"],
        couponButtons: ["领取", "立即领取"],
        couponClose: ["关闭", "完成", "知道了"],
        // 购买按钮（详情页）
        buyButtons: ["立即购买", "马上抢", "确定"],
        // SKU 面板确认键
        skuConfirm: ["确定", "确认"],
        // 确认订单页特征
        confirmMarkers: ["提交订单", "确认订单"],
        // “实付款”金额附近的标签（按优先级）
        priceLabels: ["实付款", "合计", "需付款", "应付"],
        // 提交订单按钮
        submitButtons: ["提交订单"],
        // 提交成功特征
        submitOkMarkers: ["待付款", "去支付", "收银台"],
        // 返回放弃确认弹窗
        discardButtons: ["放弃", "暂不", "取消"],
        // 风控/验证特征
        captchaMarkers: ["滑动验证", "安全验证", "拖动滑块", "验证"]
    },
    jd: {
        packageName: "com.jingdong.app.mall",
        detailMarkers: ["领券", "立即购买", "加入购物车", "抢购"],
        couponEntry: ["领券", "优惠"],
        couponButtons: ["领取", "立即领取"],
        couponClose: ["关闭", "完成", "知道了", "确定"],
        buyButtons: ["立即购买", "抢购", "确定"],
        skuConfirm: ["确定", "确认"],
        confirmMarkers: ["提交订单", "填写订单"],
        priceLabels: ["实付款", "合计", "需付款", "应付总额"],
        submitButtons: ["提交订单"],
        submitOkMarkers: ["待付款", "去支付", "收银台", "京东收银台"],
        discardButtons: ["放弃", "暂不", "取消"],
        captchaMarkers: ["滑动验证", "安全验证", "拖动滑块", "验证"]
    }
};

module.exports = SELECTORS;
