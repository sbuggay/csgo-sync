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
const utility_1 = require("./utility");
const APP_ID = 730;
const STEAM_API_KEY = process.env.STEAM_API_KEY || null;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const OUT_FILE_NAME = "config.json";
// TODO: turn these into command line arguments
const USER_DATA_PATH = "C:/Program Files (x86)/Steam/userdata";
const CFG_RELATIVE_PATH = `${APP_ID}/local/cfg`;
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
        confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?").then(() => {
            writeConfig(configObject);
            console.log("Configs have been written.");
        });
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
            confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?").then(() => {
                writeConfig(configObject);
                console.log("Configs have been written.");
            });
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
        const configPath = path_1.join(USER_DATA_PATH, result, CFG_RELATIVE_PATH);
        const configFiles = utility_1.getMatchingFiles(configPath, SUPPORTED_CONFIG_FILES);
        const exportObject = {};
        // Read in config files
        configFiles.forEach(file => {
            const filename = path_1.basename(file);
            exportObject[filename] = fs.readFileSync(file, "utf8");
        });
        // Write serialized config file out
        fs.writeFileSync(OUT_FILE_NAME, JSON.stringify(exportObject, null, 4));
        console.log(`Config written to ${OUT_FILE_NAME}}.`);
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
            const configPath = path_1.join(USER_DATA_PATH, result, CFG_RELATIVE_PATH);
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
    utility_1.getDirectories(USER_DATA_PATH).forEach(value => {
        for (const file in configObject) {
            fs.writeFileSync(path_1.join(USER_DATA_PATH, value, CFG_RELATIVE_PATH, file), configObject[file]);
        }
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
        inquirer.prompt({ type: "confirm", name: "confirm", message }).then(answer => {
            answer ? resolve() : reject();
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
        let configDirs = utility_1.getDirectories(USER_DATA_PATH);
        const files = {};
        const playerSummaries = {};
        // Get player summaries so we can show account name next to steamid
        if (STEAM_API_KEY) {
            const response = yield utility_1.getPlayerSummaries(PLAYER_SUMMARIES_API_URL, STEAM_API_KEY, configDirs);
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
function default_1() {
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
    console.log("csgo-sync");
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
