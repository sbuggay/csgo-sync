"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const fs = require("fs");
const inquirer = require("inquirer");
const path_1 = require("path");
// TODO: turn these into command line arguments
const APP_ID = 730;
const API_KEY = "1578879989BD74A6D189050250810E86";
const BIT_SHIFT = 61197960265728;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const OUT_FILE_NAME = "out.json";
const resources = {
    import: "Import from file",
    importweb: "Import from URL",
    export: "Export config",
    sync: "Syncronize configs"
};
var EApplicationOptions;
(function (EApplicationOptions) {
    EApplicationOptions["IMPORT"] = "IMPORT";
    EApplicationOptions["IMPORTWEB"] = "IMPORTWEB";
    EApplicationOptions["EXPORT"] = "EXPORT";
    EApplicationOptions["SYNC"] = "SYNC";
})(EApplicationOptions || (EApplicationOptions = {}));
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
    // Select config directory to export
    selectConfigDir("Which config would you like to export?").then(result => {
        const configPath = path_1.join(userDataPath, result, cfgRelativePath);
        const configFiles = getConfigFiles(configPath);
        const exportObject = {};
        // Read in config files
        configFiles.forEach(file => {
            const filename = path_1.basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });
        // Write serialized config file out
        fs.writeFileSync("out.json", JSON.stringify(exportObject));
        console.log(`Config written to ${path_1.join(process.cwd, "out.json")}`);
    });
}
/**
 * Sync all configs from selected config
 *
 */
function sync() {
    selectConfigDir("Which config would you like to sync from?").then(result => {
        confirm("Are you sure you want to sync?").then(confirmation => {
            const configPath = path_1.join(userDataPath, result, cfgRelativePath);
            const configFiles = getConfigFiles(configPath);
            const files = {};
            // Grab all the config files from the source directory
            configFiles.forEach(file => {
                const filename = path_1.basename(file);
                files[filename] = fs.readFileSync(file, "utf8");
            });
            // Write this file to all other config directories
            if (confirmation) {
                getDirectories(userDataPath).forEach(value => {
                    for (const file in files) {
                        fs.writeFileSync(path_1.join(userDataPath, value, cfgRelativePath, file), files[file]);
                    }
                });
            }
        });
    });
}
/**
 * Helper function to ask for confirmation
 *
 * @param {string} message
 * @returns {Promise<boolean>}
 */
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
/**
 * Helper function to ask user to select a config directory
 *
 * @param {string} message
 * @returns {Promise<string>}
 */
function selectConfigDir(message) {
    return new Promise((resolve, reject) => {
        // Get all the config directories
        let configDirs = getDirectories(userDataPath);
        const files = {};
        const playerSummaries = {};
        // Get player summaries so we can show account name next to steamid
        getPlayerSummaries(configDirs).then(response => {
            response.forEach(summary => {
                playerSummaries[summary.steamid] = summary;
            });
            const choices = [];
            configDirs.forEach(value => {
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
        case EApplicationOptions.EXPORT:
            exportConfig();
            break;
        case EApplicationOptions.IMPORT:
            importConfig();
            break;
        case EApplicationOptions.IMPORTWEB:
            importConfig(true);
            break;
        case EApplicationOptions.SYNC:
            sync();
            break;
    }
}
const choices = [
    {
        name: resources.sync,
        value: EApplicationOptions.SYNC,
    },
    {
        name: resources.import,
        value: EApplicationOptions.IMPORT
    },
    {
        name: resources.importweb,
        value: EApplicationOptions.IMPORTWEB
    },
    new inquirer.Separator(),
    {
        name: resources.export,
        value: EApplicationOptions.EXPORT
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