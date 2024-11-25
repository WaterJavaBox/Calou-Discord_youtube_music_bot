//導入模組
import fs from 'fs' //fs
import { Client, Events, GatewayIntentBits, Partials } from "discord.js"      //discord.js
  

//Client 權限設定，禁止私訊
const client = new Client({
    intents: [53608447],
    partials: [],
});

//機器人Config
let botConfig = {};

//所有指令區
let allCommand = [];

//建立伺服器運行庫
let server = {};

//當機器人啟動時
client.on("ready", ()=>{
    console.clear();
    console.log(`正在使用 ${client.user.displayName} 登入 !`);
    console.log(`邀請 https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=0&scope=bot`);
});

//收到指令時
client.on("interactionCreate", async (interaction) => {
    //禁止機器人使用指令
    if(!interaction.isCommand() || interaction.user.bot) return;

    //檢查指令是來自何處
    for(let i in allCommand){
        //如果核對上
        if(interaction.commandName == allCommand[i].slash.name){
            //導入該模組，該模組理應回傳一個new方法
            let useModule = await import(`./Module/${allCommand[i].module}.js`);

            //如果沒有該伺服器，則創建
            if(!server[interaction.guildId]){
                server[interaction.guildId] = {};
            }
            
            //如果沒有該方法，則創建
            if(!server[interaction.guildId][allCommand[i].module]){
                server[interaction.guildId][allCommand[i].module] = new useModule.MusicState();
            }

            //鎖定方法
            let method = server[interaction.guildId][allCommand[i].module];

            //創建指令
            const executeRuntime = Function("client", "interaction", "botConfig", "method", "", `
                "use strict";
                method.${allCommand[i].execute}(client, interaction, botConfig);
            `);

            //執行
            executeRuntime(client, interaction, botConfig, method);
        }
    }
})

//主程序
export async function login(_IMPORT_botConfig, _IMPORT_allCommand) {
    //將機器人資訊放入
    botConfig = _IMPORT_botConfig;

    //將指令存入
    allCommand = _IMPORT_allCommand;

    //登入
    client.login(botConfig.token.Discord);
}