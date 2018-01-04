const inquirer = require("inquirer");
const request = require("request");

const fs = require("fs");
const { join } = require("path");

const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";

const bit = 61197960265728;

function convertTo64BitId(id) {
    return `765${Number(id) + bit}`;
}

const userDataPath = "C:/Program Files (x86)/Steam/userdata";
const cfgRelativePath = `${APP_ID}/local/cfg`;
const configFiles = [
    "config.cfg",
    "autoexec.cfg",
    "video.txt"
];

function getPlayerSummaries(ids) {
    return new Promise((resolve, reject) => {
        if (ids && ids.length && ids.length > 0) {
            return request(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`, (error, response, body) => {
                if (error) {
                    throw new Error(error);
                }
                resolve(JSON.parse(body).response.players);
            });
        }
        else {
            throw new Error("ids must be an array");
        }
    });
}

function isDirectory(source) {
    return fs.lstatSync(source).isDirectory();
}

function getConfigFiles(source) {
    return fs.readdirSync(source).filter(name => configFiles.includes(name));
}

function getDirectories(source) {
    return fs.readdirSync(source).filter(name => isDirectory(join(userDataPath, name)));
}
function copyFile(source, destination) {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(destination);
    if (readStream && writeStream) {
        readStream.pipe(writeStream);
    }
}

function main() {
    const configDirs = getDirectories(userDataPath);

    const files = {};
    const playerSummaries = {};

    getPlayerSummaries(configDirs).then(response => {
        response.forEach(summary => {
            playerSummaries[summary.steamid] = summary;
        });

        const choices = [];

        configDirs.forEach(value => {
            files[value] = getConfigFiles(join(userDataPath, value, cfgRelativePath)).map(name => join(userDataPath, value, cfgRelativePath, name));
            if (playerSummaries[convertTo64BitId(value)]) {
                choices.push(`${value} [${playerSummaries[convertTo64BitId(value)].personaname}]`);
            }
            else {
                choices.push(value);
            }
        });

        inquirer.prompt([{
            type: "list",
            name: "source",
            message: "Which config would you like to copy",
            choices
        }]).then(answers => {


            const id = answers.source.split(" ")[0];

            console.log(files[id]);
        });
    });
}


inquirer.prompt([{
    type: "list",
    name: "source",
    message: "Where are the source configs?",
    choices: [
        "copy",
        "gist",
        "file"
    ]
}]).then(answers => {
    console.log(answers);
    main();
});

