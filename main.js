//選擇機器人
async function configSelector(){
    //導入fs模組
    const fs = await import('fs')

    //清除畫面
    process.stdout.write("\x1B[2J\x1B[0;0H");
    console.clear();

    //根目錄
    const configRoot = "./Config/";

    //掃描 BOT_DATA 的所有資料夾
    const allFiles = fs.readdirSync(configRoot);

    //建立選擇器，只存放副檔名為json的檔案
    let jsonFiles = [];
    for(let i = 0; i < allFiles.length; i++){
        if(allFiles[i].endsWith(".json")){
            jsonFiles.push(allFiles[i]);
        }
    }

    //如果沒有任何json
    if(jsonFiles.length == 0){
        console.log("\x1b[31m" + "找不到任何Config" + "\x1b[0m");
        process.exit(0);    //結束程式
    }

    //顯示所有json
    console.log("以下為可選擇Config");
    for(let i = 0; i < jsonFiles.length; i++){
        console.log((i + 1) + " : " + jsonFiles[i]);
    }

    //建立回答
    let answer;

    //假設選項只有1個
    if(jsonFiles.length == 1){
        //設定預設值
        answer = 1;
    }else{
        //建立rl
        const rl = readline.createInterface({
            input: process.stdin, output: process.stdout
        });

        //建立承諾，用於等待回應
        answer = await new Promise((res) => {
            rl.question("選擇 : ", (answer) => res(answer))
        });

        //關閉rl
        rl.close();    
    }

    //判斷是否為數字或者超出範圍
    if(isNaN(answer) || answer < 1 || answer > jsonFiles.length){
        console.log("\x1b[31m" + "請輸入正確選項" + "\x1b[0m");

        //等待
        await new Promise(res => {
            setTimeout(()=>{res(true)}, 1000)
        });
    }

    //顯示選擇機器人
    console.log(`正在讀取 : ${jsonFiles[answer - 1]}`);

    //等待
    await new Promise(res => {
        setTimeout(()=>{res(true)}, 1000)
    });

    //回傳機器人config
    return JSON.parse(fs.readFileSync(`${configRoot}${jsonFiles[answer - 1]}`));
}

//主程序路口
async function main() {
    //初始化機器人
    let botConfig = await configSelector();

    //導入註冊指令
    const commands = await import("./commands.js");

    //註冊指令，並取得所有指令回傳
    let allCommand = await commands.main(botConfig);

    //導入Discord機器人運行檔案
    const discord = await import("./discord.js");

    //運行機器人
    discord.login(botConfig, allCommand);
}

//運行
main();