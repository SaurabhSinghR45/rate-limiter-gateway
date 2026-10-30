const stats = new Map();
export const statsTracker = (req, res, next) => {
    const clientId = req.ip;

    res.on("finish", ()=>{
        if(!stats.has(clientId)){
            stats.set(clientId, {total : 0, allowed : 0, blocked : 0});
        }

        const cleintStats = stats.get(clientId);
        cleintStats.total++;

        if(res.statusCode === 429) cleintStats.blocked++;
        else cleintStats.allowed++;
    })
    next();
}

export const getStats = () => {
    return Object.fromEntries(stats);
}