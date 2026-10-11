/**
 * config.js —— 所有需要你改的东西都在这一个文件里。
 */

module.exports = {
    // Server酱 SendKey，用于把“锁单成功/失败”推到你微信
    // 免费申请：https://sct.ftqq.com/ ；不想推送就留空 ""
    serverchanSendkey: "",

    // 巡检间隔（小时）。几个商品的量，4 小时一轮足够；大促可改 1
    intervalHours: 4,

    // 判定参数
    judge: {
        windowDays: 30,        // “近期最低”看多少天
        cooldownHours: 24,     // 锁单成功后多久内不重复锁单
        sanityRatio: 0.3       // 低于近10次中位价的30%视为取数异常，不锁单
    },

    // 风控冷却：某平台出现滑块后暂停该平台多少小时
    captchaCooldownHours: 12,

    // 试运行：true = 只比价推送，不自动锁单（建议先开一两周，验证取数准确再关掉）
    dryRun: true,

    // 运行时段：只在这几个小时里巡检（24 小时制，可跨天如 [23, 7]）。
    // 留空数组 [] = 全天都跑。主力机建议设在睡觉/不用手机的时间段。
    runWindow: [1, 7],

    // 每个商品/平台之间的间隔（毫秒），拟人化，别改太小
    gapBetweenItems: [20000, 45000],

    // ===== 商品清单 =====
    // 一组 = 同一个东西在各平台的链接 + SKU 规格文字（规格面板显示什么填什么）
    // targetPrice 可选：写了 = 低于此价就锁单；不写 = 看“全网最低 + 近30天最低”
    groups: [
        {
            id: "iphone17-white-256",
            name: "iPhone 17 白色 256G",
            targetPrice: 5499,
            items: {
                taobao: {
                    url: "https://item.taobao.com/item.htm?id=填真实商品ID",
                    sku: ["白色", "256GB"]
                },
                jd: {
                    url: "https://item.jd.com/填真实SKU号.html",
                    sku: ["白色", "256GB"]
                }
            }
        },
        {
            id: "example-switch2",
            name: "Switch 2 主机",
            items: {
                taobao: { url: "https://item.taobao.com/item.htm?id=xxx", sku: [] },
                jd: { url: "https://item.jd.com/xxx.html", sku: [] }
            }
        }
    ]
};
