//node-fetch
import fetch from 'node-fetch'

//查詢歌曲函數
export async function search({keyWord, apiKey} = {}) {
    const searchFetch = await fetch([
        `https://youtube.googleapis.com/youtube/v3/search?part=snippet`,
        `q=${keyWord}`,
        `key=${apiKey}`
    ].join("&"));

    const result = await searchFetch.json();

    return `https://www.youtube.com/watch?v=${result.items[0].id.videoId}`;
}


//查詢頻道資訊
export async function channelInfo({uid, apiKey} = {}) {
    const searchFetch = await fetch([
        `https://youtube.googleapis.com/youtube/v3/channels?part=snippet`,
        `id=${uid}`,
        `key=${apiKey}`
    ].join("&"));

    const result = await searchFetch.json();

    return result;
}