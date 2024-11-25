/*
    Make by Calou. < https://github.com/YQ-Calou >
*/

//Discord.js (嵌入合成器)
import { EmbedBuilder } from 'discord.js';
//音訊模組導入
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
//ytdl核心
import ytdl from '@distube/ytdl-core';

//建立新類別，用於音樂機器人，每個頻道一個新類別
class MusicState {
    constructor() {
        //播放狀態 playing | stop | pause
        this.playStatus = "stop";
        //清單
        this.queueList = [];
        //清單位置
        this.position = -1;

        //當前參照指令
        this.referer = null;

        //語音連線狀態
        this.connection = {};
        //播放器狀態
        this.player = null;
        //播放器時長
        this.startTime = null;
        //累計播放時長
        this.elapsedTime = 0;

        //錯誤訊息
        this.errorLog = [];
        //最後一個文字區
        this.lastChat = null;
    }

    /**
     * 加入頻道
     * 
     * @param {Object} client - Discord.js client.
     * @param {String} interaction - Discord.js interaction.
     * 
     * @returns {Boolean} Return whether command execution was succesful.
     */
    async join(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "join";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //建立該進入的伺服器地址
        let voiceChannelID = "";

        //如果沒有指定頻道，則替換為使用者所在頻道
        if (!interaction.options.get("voice_channel"))
            voiceChannelID = interaction.member.voice.channel?.id || 0;
        else
            voiceChannelID = interaction.options.get("voice_channel").value;

        const serverExist = interaction.guild.channels.cache.get(voiceChannelID) ? true : false;

        //檢查伺服器存在
        if (!serverExist && runtimeFlag == true) {
            //回應使用者
            interaction.reply({
                content: "⛔ 我找不到頻道...",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果機器人在語音頻道內
        if (Object.keys(this.connection).length != 0 && serverExist) {
            //取得頻道使用者人數
            let voiceChannelMembers = interaction.guild.channels.cache.get(this.connection.joinConfig.channelId).members.size;

            //如果機器人已經存在於相同語音區
            if (this.connection.joinConfig.channelId == voiceChannelID && this.referer == methodName && runtimeFlag == true) {
                //回應使用者
                interaction.reply({
                    content: "⛔ 我已經存在於這個語音室囉。",
                    ephemeral: true
                });

                //設定失敗旗標
                runtimeFlag = false;
            }

            //如果機器人正在播放歌曲，而且有人(包含自己就是大於1)
            if (this.playStatus != "stop" && voiceChannelMembers > 1 && runtimeFlag == true) {
                //回應使用者
                interaction.reply({
                    content: "⛔ 目前歌曲正在其他頻道播放，無法移動 !",
                    ephemeral: true
                });

                //設定失敗旗標
                runtimeFlag = false;
            }
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //取得要求的伺服器
        const guildId = interaction.guildId;

        //連接該頻道
        this.connection = joinVoiceChannel({
            channelId: voiceChannelID,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator
        })

        //如果參照指令是join，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "✨ 我已經加入頻道囉~",
                ephemeral: true
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳成功
        return true;
    }

    /**
     * 添加歌曲
     * 
     * @param {Object} client - Discord.js client.
     * @param {String} interaction - Discord.js interaction.
     * 
     * @returns {Boolean} Return whether command execution was succesful.
     */
    async play(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "play";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //建立連線
        const connection = (Object.keys(this.connection).length == 0 || this.playStatus == "stop") ? await this.join(client, interaction) : true;

        //如果未連接語音頻道
        if (!connection) {
            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction.member.voice.channel?.id) {
            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //建立播放目標網址
        let videoUrl = "";

        //導入查詢模塊
        const Youtube = await import("./Youtube.js");

        //如果找不到參數
        if (!interaction.options.get("input"))
            videoUrl = "https://www.youtube.com/watch?v=pYNxvVq8GQg";
        else
            videoUrl = interaction.options.get("input").value;

        //如果不是網址，則查詢
        if (videoUrl.indexOf("http") != 0) {
            //查詢
            videoUrl = await Youtube.search({ keyWord: videoUrl, apiKey: botConfig.token.Google });
        }

        //取得影片資訊
        const videoInfo = (await ytdl.getBasicInfo(videoUrl)).player_response.videoDetails;
        //取得頻道資訊
        const channelInfo = await Youtube.channelInfo({ uid: videoInfo.channelId, apiKey: botConfig.token.Google });

        //向佇列中推送一個歌曲
        this.queueList.push({
            video: {
                url: videoUrl,
                id: videoInfo.videoId,
                title: videoInfo.title,
                author: videoInfo.author,
                thumbnails: `https://i.ytimg.com/vi/${videoInfo.videoId}/hqdefault.jpg`,
                lengthSeconds: videoInfo.lengthSeconds,
                origin: videoInfo
            },
            channel: {
                url: `https://www.youtube.com/channel/${videoInfo.channelId}`,
                id: videoInfo.channelId,
                thumbnails: channelInfo.items[0].snippet.thumbnails.high.url,
                origin: channelInfo
            }
        });

        let embed = new EmbedBuilder()
            .setAuthor({
                name: "🆕 已經推送新的歌曲至清單中。",
                iconURL: this.queueList.at(-1).channel.thumbnails,
            })
            .setTitle(this.queueList.at(-1).video.title)
            .setURL(this.queueList.at(-1).video.url)
            .addFields(
                {
                    name: "作者",
                    value: `[${this.queueList.at(-1).video.author}](${this.queueList.at(-1).channel.url})`,
                    inline: true
                },
                {
                    name: "時長",
                    value: `${this.queueList.at(-1).video.lengthSeconds}秒`,
                    inline: true
                }
            )
            .setThumbnail(this.queueList.at(-1).video.thumbnails)
            .setFooter({
                text: client.user.displayName,
            })
            .setColor("#f50000")
            .setTimestamp();

        //發送佇列推送
        interaction.reply({
            embeds: [embed],
            ephemeral: false
        });

        embed = null;

        //如果是停止的，則下一首
        if (this.playStatus == "stop") {
            await this.next();
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //如果是停止的，則播放
        if (this.playStatus == "stop") {
            this.#Player();
        }

        //結束
        return true;
    }

    //下一首
    async next(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "next";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction?.member.voice.channel?.id && runtimeFlag == true && this.referer == methodName) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //將位置+1
        this.position += 1;

        //如果高於最後佇列，則設定為最後佇列
        if (this.position >= this.queueList.length - 1) {
            this.position = this.queueList.length - 1;
        }

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "➡️ 已播放下一首 !",
                ephemeral: false
            });
        }

        //如果參照是自己，則清空參照，啟動播放器
        if (this.referer == methodName) {
            this.referer = null;
            this.#Player();
        }

        //回傳
        return true;
    }

    //上一首
    async previous(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "previous";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction?.member.voice.channel?.id && runtimeFlag == true && this.referer == methodName) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //將位置-1
        this.position -= 1;

        //如果低於0，則設定為0
        if (this.position <= 0) {
            this.position = 0;
        }

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "⬅️ 已播放上一首 !",
                ephemeral: false
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
            this.#Player();
        }

        //回傳
        return true;
    }

    //暫停
    async pause(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "pause";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction.member.voice.channel?.id && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果當前播放狀態不是playing
        if (this.playStatus != "playing" && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 歌曲已經停止。",
                ephemeral: true
            });

            //將旗標改為錯誤
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //暫停音樂
        this.#Pause();

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "⏸️ 已暫停音樂。",
                ephemeral: false
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳
        return true;
    }

    //回復
    async resume(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "playing";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction.member.voice.channel?.id && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果當前播放狀態是pause
        if (this.playStatus == "playing" && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 歌曲並未停止。",
                ephemeral: true
            });

            //將旗標改為錯誤
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //恢復音樂
        this.#Resume();

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "▶️ 音樂將繼續播放。",
                ephemeral: false
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳成功
        return true;
    }

    //停止
    async stop(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "stop";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction.member.voice.channel?.id && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果當前播放狀態是stop
        if (this.playStatus == "stop" && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 歌曲已經是停止狀態。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //停止音樂
        this.#Stop();

        //將索引設為最後
        this.position = this.queueList.length - 1;

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                content: "⏹️ 已停止音樂。",
                ephemeral: false
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳成功
        return true;
    }

    //移除
    async remove(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "remove";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果不在同一個語音頻道內
        if (this.connection.joinConfig.channelId != interaction?.member.voice.channel?.id && runtimeFlag == true && this.referer == methodName) {
            interaction.reply({
                content: "⛔ 你不能在其他頻道裡使用本指令。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //取得移除的歌曲
        const removePosition = interaction.options.get("position")?.value;

        //如果輸入是空的
        if (!removePosition && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 請填入要刪除的歌曲位置。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果陣列是空的
        if (!this.queueList[removePosition - 1] && runtimeFlag == true) {
            interaction.reply({
                content: "⛔ 查無歌曲在清單中。",
                ephemeral: true
            });

            //設定失敗旗標
            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //刪除歌曲
        this.queueList[removePosition - 1] = undefined;

        //過濾所有undefined，並移除
        this.queueList = this.queueList.filter(data => data !== undefined);

        //如果移除的歌曲在索引之下，則索引-1
        if (removePosition - 1 < this.position)
            this.position -= 1;

        //如果移除的歌曲等於正在播放的歌曲，則下一首
        if (removePosition - 1 == this.position)
            this.next();

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳
        return true;
    }

    //清單
    async info(client, interaction, botConfig) {
        //建立本方法令牌
        const methodName = "info";

        //建立執行狀態旗標，false為失敗
        let runtimeFlag = true;

        //如果當前參照指令是空的
        if (this.referer == null) {
            this.referer = methodName;
        }

        //如果是停止播放，回傳錯誤
        if (this.playStatus == "stop") {
            interaction.reply({
                content: "⛔ 目前沒有音樂可以取得。",
                ephemeral: true
            });

            runtimeFlag = false;
        }

        //如果旗標是false，則回傳失敗
        if (!runtimeFlag) {
            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }

            //結束
            return false;
        }

        //建立影片已過時間
        let spendTime = 0;

        //如果是暫停
        if (this.playStatus == "pause")
            spendTime = this.elapsedTime / 1000;

        //如果是播放中
        if (this.playStatus == "playing")
            spendTime = (Date.now() - this.startTime) / 1000;

        //取整數
        spendTime = parseInt(spendTime);

        //計算影片長條
        const calcVideoLength = (spendTime, videoTime) => {
            //計算百分比
            const persent = spendTime / videoTime;

            //長度
            const length = 18;

            //長條文字
            let lengthText = [];

            //for生成
            for(let i = 0; i < length; i++){
                lengthText.push("-");
            }

            //計算位置
            const position = parseInt(persent * length);

            //替換
            lengthText[position] = "●";

            //回傳
            return lengthText.join("");
        }

        //計算時間，將時間轉換為可讀
        const convertTime = (timestamp) => {
            //小時
            let hour = parseInt(timestamp / 60 / 60);
            //分鐘
            let min = parseInt(timestamp / 60);
            //秒
            let sec = parseInt(timestamp % 60);

            //建立陣列
            let clock = [];

            //如果小時沒有超過1，則不顯示
            if(hour >= 1){
                clock.push(hour);
            }

            //推入分鐘
            clock.push(min);
            //推入秒鐘
            clock.push(sec);

            //逐一建立雙位數
            for(let i in clock){
                if(clock[i] < 10){
                    clock[i] = `0${clock[i].toString()}`;
                }
            }

            //連結後回傳
            return clock.join(":");
        }

        //建立嵌入表
        const embed = new EmbedBuilder()
            .setAuthor({
                name: "📜 歌曲資訊",
                iconURL: this.queueList[this.position].channel.thumbnails,
            })
            .setTitle(this.queueList[this.position].video.title)
            .setURL(this.queueList[this.position].video.url)
            .addFields(
                {
                    name: "作者",
                    value: `[${this.queueList[this.position].video.author}](${this.queueList[this.position].channel.url})`,
                    inline: false
                },
                {
                    name: "目前狀態",
                    value: this.playStatus,
                    inline: true
                },
                {
                    name: "目前長度",
                    value: `${convertTime(spendTime)}  ${calcVideoLength(spendTime, this.queueList[this.position].video.lengthSeconds)}  ${convertTime(this.queueList[this.position].video.lengthSeconds)}`,
                    inline: true
                },
            )
            .setImage(this.queueList[this.position].video.thumbnails)
            .setColor("#0000f5")
            .setFooter({
                text: "浬晞",
            })
            .setTimestamp();

        //如果參照指令是本方法，回應使用者
        if (this.referer == methodName) {
            interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        //如果參照是自己，則清空參照
        if (this.referer == methodName) {
            this.referer = null;
        }

        //回傳
        return true;
    }

    //更新播放器
    async #Player() {
        //建立本方法令牌
        const methodName = "#Player";

        //停止播放
        if (this.player != null) {
            this.#Stop();
        }

        //使用 ytdl-core 獲取音訊
        const stream = ytdl(this.queueList[this.position].video.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25, // 提高緩存，防止卡頓
        });

        //創建音訊播放器
        this.player = createAudioPlayer();

        //取得資源
        const resource = createAudioResource(stream);

        //播放音訊
        this.#Play(resource);

        //向頻道推送音源
        this.connection.subscribe(this.player);

        //如果發生錯誤
        this.player.on('error', async (error) => {
            //如果當前參照指令是空的
            if (this.referer == null) {
                this.referer = methodName;
            }

            //推送錯誤
            this.errorLog.push(error);

            //如果不是佇列最後
            if (this.position < this.queueList.length) {
                //跳過
                await this.next();
            }

            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }
        });

        //如果播放完畢
        this.player.on('idle', async () => {
            //如果當前參照指令是空的
            if (this.referer == null) {
                this.referer = methodName;
            }

            //如果不是佇列最後
            if (this.position < this.queueList.length - 1) {
                //下一首
                await this.next();

                //播放
                this.#Player();
            } else {
                //停止播放
                this.#Stop();
            }

            //如果參照是自己，則清空參照
            if (this.referer == methodName) {
                this.referer = null;
            }
        });
    }

    #Play(resource) {
        //開始播放音訊
        this.player.play(resource);
        this.playStatus = "playing";

        //紀錄當前時間
        this.startTime = Date.now();
        this.elapsedTime = 0;
    }

    #Pause() {
        //暫停音訊
        this.player.pause();
        this.playStatus = "pause";

        //目前時間減去當前時間
        this.elapsedTime = Date.now() - this.startTime;

        //移除開始時間
        this.startTime = 0;
    }

    #Resume() {
        //繼續播放
        this.player.unpause();
        this.playStatus = "playing";

        //回復開始時間，算法為，以儲存時間-目前時間
        this.startTime = Date.now() - this.elapsedTime;
        this.elapsedTime = 0;
    }

    #Stop() {
        //停止音訊
        this.player.stop();
        this.playStatus = "stop";

        //全部重置
        this.startTime = null;
        this.elapsedTime = 0;
    }
}

export { MusicState };