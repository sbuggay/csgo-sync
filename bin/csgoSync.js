"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const fs = require("fs");
const inquirer = require("inquirer");
const path_1 = require("path");
const program = require("commander");
const packageJson = require("../package.json");
const utility_1 = require("./utility");
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const SUPPORTED_CONFIG_FILES = [
    "config.cfg",
    "autoexec.cfg",
    "video.txt"
];
const resources = {
    import: "Import from file",
    importweb: "Import from URL",
    export: "Export config",
    sync: "Syncronize configs"
};
// Default configuration values
let appConfiguration = {
    appId: 730,
    outFile: "config.json",
    userDataPath: "C:/Program Files (x86)/Steam/userdata",
    cfgRelativePath: "/local/cfg",
    steamApiKey: process.env.STEAM_API_KEY || null
};
var EApplicationOptions;
(function (EApplicationOptions) {
    EApplicationOptions["IMPORT"] = "IMPORT";
    EApplicationOptions["IMPORTWEB"] = "IMPORTWEB";
    EApplicationOptions["EXPORT"] = "EXPORT";
    EApplicationOptions["SYNC"] = "SYNC";
})(EApplicationOptions || (EApplicationOptions = {}));
/**
 * Import config from file
 *
 */
function importConfig() {
    return inquirer.prompt([{ type: "input", name: "path", message: "Please enter the path of your config: " }]).then((answers) => {
        const configObject = JSON.parse(fs.readFileSync(answers.path).toString());
        console.log(configObject);
        // Ask for user confirmation
        confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?", () => writeConfig(configObject));
    });
}
/**
 * Import config from a URL and use the body as the config object
 *
 */
function importConfigWeb() {
    return inquirer.prompt([{ type: "input", name: "url", message: "Please enter the URL of your config: " }]).then((answers) => {
        request(answers.url, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }
            const configObject = JSON.parse(body);
            console.log(configObject);
            // Ask for user confirmation
            confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?", () => writeConfig(configObject));
        });
    });
}
/**
 * Export all configs to single json string
 *
 */
function exportConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        // Select config directory to export
        const result = yield selectConfigDir("Which config would you like to export?");
        const configPath = path_1.join(appConfiguration.userDataPath, result, appConfiguration.appId, appConfiguration.cfgRelativePath);
        const configFiles = utility_1.getMatchingFiles(configPath, SUPPORTED_CONFIG_FILES);
        const exportObject = {};
        // Read in config files
        configFiles.forEach(file => {
            const filename = path_1.basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });
        // Write serialized config file out
        fs.writeFileSync(appConfiguration.outFile, JSON.stringify(exportObject, null, 4));
        console.log(`Config written to ${appConfiguration.outFile}.`);
    });
}
/**
 * Sync all configs from selected config
 *
 */
function syncConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        // Select a config to syncronize from
        const result = yield selectConfigDir("Which config would you like to sync from?");
        return confirm("Are you sure you want to sync?").then(() => {
            const configPath = path_1.join(appConfiguration.userDataPath, result, appConfiguration.appId, appConfiguration.cfgRelativePath);
            const configFiles = utility_1.getMatchingFiles(configPath, SUPPORTED_CONFIG_FILES);
            const configObject = {};
            // Grab all the config files from the source directory
            configFiles.forEach(file => {
                const filename = path_1.basename(file);
                configObject[filename] = fs.readFileSync(file, "utf8");
            });
            // Write the config
            writeConfig(configObject);
            console.log("Configs have been syncronized.");
        });
    });
}
/**
 * Helper function to write config object to all supported config directories
 *
 * @param {IConfigObject} configObject
 */
function writeConfig(configObject) {
    // Write this file to all config directories
    utility_1.getDirectories(appConfiguration.userDataPath).forEach(value => {
        for (const file in configObject) {
            fs.writeFileSync(path_1.join(appConfiguration.userDataPath, value, appConfiguration.appId, appConfiguration.cfgRelativePath, file), configObject[file]);
        }
    });
    console.log("Configs have been written.");
}
/**
 * Helper function to ask for confirmation
 *
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function confirm(message, confirmedFunction) {
    return new Promise((resolve, reject) => {
        inquirer.prompt({ type: "confirm", name: "confirm", message }).then(answer => {
            if (answer) {
                if (confirmedFunction)
                    confirmedFunction();
                resolve();
            }
            else {
                reject();
            }
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
    return __awaiter(this, void 0, void 0, function* () {
        // Get all the config directories
        let configDirs = utility_1.getDirectories(appConfiguration.userDataPath);
        const files = {};
        const playerSummaries = {};
        // Get player summaries so we can show account name next to steamid
        if (appConfiguration.steamApiKey) {
            const response = yield utility_1.getPlayerSummaries(PLAYER_SUMMARIES_API_URL, appConfiguration.steamApiKey, configDirs);
            response.forEach(summary => {
                playerSummaries[summary.steamid] = summary;
            });
        }
        const choices = [];
        // If there is a player summary for this ID, add the account name to the choice
        configDirs.forEach(value => {
            if (playerSummaries[utility_1.convertTo64BitId(value)]) {
                choices.push(`${value} [${playerSummaries[utility_1.convertTo64BitId(value)].personaname}]`);
            }
            else {
                choices.push(value);
            }
        });
        // Prompt user for directory
        return inquirer.prompt([{ type: "list", name: "source", message, choices }]).then(answers => answers.source.split(" ")[0]);
    });
}
/**
 * Entry function
 *
 * @export
 */
function default_1() {
    program
        .version(packageJson.version)
        .option("-a, --appId", "appid for selected game. default: 730 (CS:GO)")
        .option("-o, --outFile", "filename and path to export a config object to. default: ./config.json")
        .option("-u, --userDataPath <path>", "Path to use for userdata. default: C:/Program Files (x86)/Steam/userdata")
        .option("-r, --cfgRelativePath <path>", "Relative path from userdata. default: /local/cfg")
        .option("--steamApiKey <key>", "Steam API key to resolve account names against Steam IDs.")
        .parse(process.argv);
    // TODO: Replace this with an extensible assign or something
    appConfiguration.appId = program.appId || appConfiguration.appId;
    appConfiguration.outFile = program.outFile || appConfiguration.outFile;
    appConfiguration.userDataPath = program.userDataPath || appConfiguration.userDataPath;
    appConfiguration.cfgRelativePath = program.cfgRelativePath || appConfiguration.cfgRelativePath;
    appConfiguration.steamApiKey = program.steamApiKey || appConfiguration.steamApiKey;
    const choices = [{
            name: resources.sync,
            value: EApplicationOptions.SYNC,
        }, {
            name: resources.import,
            value: EApplicationOptions.IMPORT
        }, {
            name: resources.importweb,
            value: EApplicationOptions.IMPORTWEB
        },
        new inquirer.Separator(), {
            name: resources.export,
            value: EApplicationOptions.EXPORT
        }];
    const registeredHandlers = {
        [EApplicationOptions.EXPORT]: exportConfig,
        [EApplicationOptions.IMPORT]: importConfig,
        [EApplicationOptions.IMPORTWEB]: importConfigWeb,
        [EApplicationOptions.SYNC]: syncConfig
    };
    // Prompt the user for the initial option
    inquirer.prompt([{
            type: "list", name: "option", message: "Please select an option", choices: choices
        }]).then((answers) => {
        return registeredHandlers[answers.option]();
    }).then(() => {
        // Application complete, cleanup
        console.log("Done.");
    });
}
exports.default = default_1;
