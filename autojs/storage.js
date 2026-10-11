/**
 * storage.js —— 本地 JSON 存储：价格快照 + 锁单记录。
 * 数据存在脚本目录下的 data/snapshots.json，几个商品的量级用 JSON 绰绰有余。
 */

var DATA_FILE = files.join(files.cwd(), "data/snapshots.json");

function load() {
    try {
        if (files.exists(DATA_FILE)) {
            return JSON.parse(files.read(DATA_FILE));
        }
    } catch (e) {
        log("存储读取失败，重建: %s", e);
    }
    return { snapshots: [], orders: [] };
}

function save(data) {
    files.ensureDir(DATA_FILE);
    files.write(DATA_FILE, JSON.stringify(data));
}

function addSnapshot(groupId, platform, price) {
    var d = load();
    d.snapshots.push({
        group_id: groupId,
        platform: platform,
        price: price,
        ts: Date.now()
    });
    // 只保留最近 90 天，防止文件无限变大
    var cutoff = Date.now() - 90 * 86400000;
    d.snapshots = d.snapshots.filter(function (s) { return s.ts >= cutoff; });
    save(d);
}

/** 某组商品近 N 天全平台最低价；无数据返回 null */
function minPriceSince(groupId, sinceMs) {
    var d = load();
    var min = null;
    d.snapshots.forEach(function (s) {
        if (s.group_id === groupId && s.ts >= sinceMs) {
            if (min === null || s.price < min) min = s.price;
        }
    });
    return min;
}

/** 某组商品最近 limit 条价格（用于异常价中位数判断） */
function recentPrices(groupId, limit) {
    var d = load();
    return d.snapshots
        .filter(function (s) { return s.group_id === groupId; })
        .sort(function (a, b) { return b.ts - a.ts; })
        .slice(0, limit)
        .map(function (s) { return s.price; });
}

/** 某组商品本轮各平台最新价（withinMs 内）：{ taobao: 5199, jd: 5249 } */
function latestOffers(groupId, platforms, withinMs) {
    var d = load();
    var now = Date.now();
    var offers = {};
    platforms.forEach(function (p) {
        var hit = null;
        d.snapshots.forEach(function (s) {
            if (s.group_id === groupId && s.platform === p
                && now - s.ts <= withinMs
                && (hit === null || s.ts > hit.ts)) {
                hit = s;
            }
        });
        if (hit) offers[p] = hit.price;
    });
    return offers;
}

function addOrder(groupId, platform, price, status, note) {
    var d = load();
    d.orders.push({
        group_id: groupId, platform: platform, price: price || null,
        status: status, note: note || "", ts: Date.now()
    });
    save(d);
}

/** 最近一次锁单成功的时间戳；无则 null */
function lastLockedTs(groupId) {
    var d = load();
    var t = null;
    d.orders.forEach(function (o) {
        if (o.group_id === groupId && o.status === "locked") {
            if (t === null || o.ts > t) t = o.ts;
        }
    });
    return t;
}

module.exports = {
    addSnapshot: addSnapshot,
    minPriceSince: minPriceSince,
    recentPrices: recentPrices,
    latestOffers: latestOffers,
    addOrder: addOrder,
    lastLockedTs: lastLockedTs
};
