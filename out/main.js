"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const fs = require("fs");
const inquirer = require("inquirer");
const path_1 = require("path");
const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const BIT_SHIFT = 61197960265728;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const resources = {
    import: "import",
    export: "export",
    sync: "sync"
};
var applicationOptions;
(function (applicationOptions) {
    applicationOptions["IMPORT"] = "IMPORT";
    applicationOptions["IMPORTWEB"] = "IMPORTWEB";
    applicationOptions["EXPORT"] = "EXPORT";
    applicationOptions["SYNC"] = "SYNC";
})(applicationOptions || (applicationOptions = {}));
/**
 * Utility function to convert 32bit steamids to 64bit
 *
 * @param {any} id
 * @returns
 */
function convertTo64BitId(id) {
    return `765${Number(id) + BIT_SHIFT}`;
}
// TODO: Add more search paths
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
            const url = `${PLAYER_SUMMARIES_API_URL}/?key=${API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`;
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
    return fs.readdirSync(path).filter(name => configFiles.indexOf(name) !== -1).map(value => path_1.join(path, value));
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
function importConfig(web = false) {
    inquirer.prompt([{
            type: "input",
            name: "url",
            message: "Please enter the url of your config"
        }]).then((answers) => {
        request(answers.url, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }
            console.log(body);
        });
    });
}
/**
 * Export all configs to single json string
 *
 */
function exportConfig() {
    const exportObject = {};
    selectConfigDir("Which config would you like to export?").then(result => {
        const configPath = path_1.join(userDataPath, result, cfgRelativePath);
        const configFiles = getConfigFiles(configPath);
        configFiles.forEach(file => {
            const filename = path_1.basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });
        // Write serialized config file out
        fs.writeFileSync("out.json", JSON.stringify(exportObject));
    });
}
/**
 * Sync all configs from selected config
 *
 */
function sync() {
    selectConfigDir("Which config would you like to sync from?").then(result => {
        confirm("Are you sure you want to sync?").then(answer => {
            const configPath = path_1.join(userDataPath, result, cfgRelativePath);
            const configFiles = getConfigFiles(configPath);
            const files = {};
            configFiles.forEach(file => {
                const filename = path_1.basename(file);
                files[filename] = fs.readFileSync(file, "utf8");
            });
            if (answer) {
                let configDirs = getDirectories(userDataPath);
                console.log(configDirs);
            }
        });
    });
}
function confirm(message) {
    return new Promise((resolve, reject) => {
        inquirer.prompt({
            type: "confirm",
            name: "confirm",
            message
        }).then(answer => {
            resolve(answer.confirm);
        });
    });
}
function selectConfigDir(message) {
    return new Promise((resolve, reject) => {
        let configDirs = getDirectories(userDataPath);
        const files = {};
        const playerSummaries = {};
        getPlayerSummaries(configDirs).then(response => {
            response.forEach(summary => {
                playerSummaries[summary.steamid] = summary;
            });
            const choices = [];
            configDirs = configDirs.map(value => {
                files[value] = getConfigFiles(path_1.join(userDataPath, value, cfgRelativePath)).map(name => path_1.join(userDataPath, value, cfgRelativePath));
                if (playerSummaries[convertTo64BitId(value)]) {
                    choices.push(`${value} [${playerSummaries[convertTo64BitId(value)].personaname}]`);
                }
                else {
                    choices.push(value);
                }
                return path_1.join(userDataPath, value, cfgRelativePath);
            });
            inquirer.prompt([{
                    type: "list",
                    name: "source",
                    message,
                    choices
                }]).then(answers => {
                const id = answers.source.split(" ")[0];
                resolve(id);
            });
        });
    });
}
function main(option) {
    switch (option) {
        case applicationOptions.EXPORT:
            exportConfig();
            break;
        case applicationOptions.IMPORT:
            importConfig();
            break;
        case applicationOptions.IMPORTWEB:
            importConfig(true);
            break;
        case applicationOptions.SYNC:
            sync();
            break;
    }
}
const choices = [
    {
        name: "sync",
        value: applicationOptions.SYNC
    },
    {
        name: "import",
        value: applicationOptions.IMPORT
    },
    {
        name: "export",
        value: applicationOptions.EXPORT
    },
];
inquirer.prompt([{
        type: "list",
        name: "option",
        message: "Please select one",
        choices: choices
    }]).then((answers) => {
    main(answers.option);
});
//# sourceMappingURL=main.js.map