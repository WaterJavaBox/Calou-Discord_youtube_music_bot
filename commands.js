//導入模組
import fs from 'fs' //fs
import { REST, Routes } from "discord.js" //discord.js

//主程序
export async function main(config){
    //如果config是空的，不運行
    if(!config)
        process.exit(0);

    //取得所有指令
    let allCommand = await scanDirCommands("./Commands");

    //所有指令格式
    let allCommandsBody = [];

    //排序所有指令
    allCommand.forEach(command => {
        allCommandsBody.push(command.slash);
    });

    //註冊
    await registerCommand(config, allCommandsBody);

    //回傳所有指令參數
    return allCommand;
}

//註冊指令
async function registerCommand(config, commands) {
    //版本註冊指令V10
    const rest = new REST({ version: '10' }).setToken(config.token.Discord);
    //添加指令
    await rest.put(Routes.applicationCommands(config.clientID), { body: commands })

    //回傳指令完成
    return true;
}

//掃描資料夾，可能是遞迴
async function scanDirCommands(Dictionary) {
    //建立總檔案陣列
    let allCommand = [];

    //掃描Commands資料夾
    let Category = fs.readdirSync(Dictionary);

    //逐一處理
    for(let i in Category){
        //鎖定檔案位置
        const lookupFileDir = `${Dictionary}/${Category[i]}`;

        //如果是資料夾，遞迴偵測
        if(fs.lstatSync(lookupFileDir).isDirectory()){
            (await scanDirCommands(lookupFileDir)).forEach(files => {
                allCommand.push(files);
            });
        } 
        //如果結尾為json，則加入
        else if(lookupFileDir.endsWith(".json")) {
            //嘗試讀取成JSON，出錯則格式錯誤
            try{
                allCommand.push(JSON.parse(fs.readFileSync(lookupFileDir, "utf-8")));
            } catch (e) {
                //顯示中文錯誤
                console.log("指令檔案非JSON格式。");
                console.log(`檔案位置: ${lookupFileDir}`);

                //顯示錯誤
                console.error(e);

                //結束程序
                process.exit(0);
            }
        }
    }

    //回傳所有檔案
    return allCommand;
}

