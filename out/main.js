"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer = require("inquirer");
const request = require("request");
const fs = require("fs");
const path_1 = require("path");
const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const bit = 61197960265728;
/**
 * Utility function to convert 32bit steamids to 64bit
 *
 * @param {any} id
 * @returns
 */
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
/**
 * Get player summaries using steam api
 *
 * @param {any} ids
 * @returns
 */
function getPlayerSummaries(ids) {
    return new Promise((resolve, reject) => {
        if (ids && ids.length && ids.length > 0) {
            const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`;
            return request(url, (error, response, body) => {
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
/**
 * Utilty function to determine if path is a directory
 *
 * @param {any} path
 * @returns
 */
function isDirectory(path) {
    return fs.lstatSync(path).isDirectory();
}
/**
 * Gets all files that match the config file mask
 *
 * @param {any} path
 * @returns
 */
function getConfigFiles(path) {
    return fs.readdirSync(path).filter(name => configFiles.indexOf(name) !== -1);
}
/**
 * Utility function to get directories of a given path
 *
 * @param {any} path
 * @returns
 */
function getDirectories(path) {
    return fs.readdirSync(path).filter(name => isDirectory(path_1.join(userDataPath, name)));
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
        configDirs.map(value => {
            files[value] = getConfigFiles(path_1.join(userDataPath, value, cfgRelativePath)).map(name => path_1.join(userDataPath, value, cfgRelativePath));
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
            configDirs.filter(name => name !== id).forEach(config => {
                console.log(files[config]);
            });
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
//# sourceMappingURL=main.js.map