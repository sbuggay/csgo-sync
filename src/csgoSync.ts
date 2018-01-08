import * as request from "request";
import * as fs from "fs";
import * as inquirer from "inquirer";
import { join, basename } from "path";

const program = require("commander");
const packageJson = require("../package.json");

import { getMatchingFiles, getDirectories, getPlayerSummaries, convertTo64BitId } from "./utility";

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
}

interface IConfigObject {
    [key: string]: string;
}

interface IApplicationConfiguration {
    appId: number,
    outFile: string,
    userDataPath: string;
    cfgRelativePath: string;
    steamApiKey?: string;
}

// Default configuration values
let appConfiguration: IApplicationConfiguration = {
    appId: 730,
    outFile: "config.json",
    userDataPath: "C:/Program Files (x86)/Steam/userdata",
    cfgRelativePath: "/local/cfg",
    steamApiKey: process.env.STEAM_API_KEY || null
}

enum EApplicationOptions {
    IMPORT = "IMPORT",
    IMPORTWEB = "IMPORTWEB",
    EXPORT = "EXPORT",
    SYNC = "SYNC"
}

/**
 * Import config from file
 * 
 */
function importConfig(): Promise<any> {
    return inquirer.prompt([{ type: "input", name: "path", message: "Please enter the path of your config: " }]).then((answers) => {
        const configObject: IConfigObject = JSON.parse(fs.readFileSync(answers.path).toString());

        console.log(configObject);

        // Ask for user confirmation
        confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?", () => writeConfig(configObject));
    });
}

/**
 * Import config from a URL and use the body as the config object
 * 
 */
function importConfigWeb(): Promise<any> {
    return inquirer.prompt([{ type: "input", name: "url", message: "Please enter the URL of your config: " }]).then((answers) => {
        request(answers.url as string, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }

            const configObject: IConfigObject = JSON.parse(body);

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
async function exportConfig(): Promise<any> {
    // Select config directory to export
    const result = await selectConfigDir("Which config would you like to export?")
    const configPath = join(appConfiguration.userDataPath, result, appConfiguration.appId, appConfiguration.cfgRelativePath);
    const configFiles = getMatchingFiles(configPath, SUPPORTED_CONFIG_FILES);

    const exportObject: IConfigObject = {};

    // Read in config files
    configFiles.forEach(file => {
        const filename = basename(file);
        exportObject[filename] = fs.readFileSync(file, "utf8");
    });

    // Write serialized config file out
    fs.writeFileSync(appConfiguration.outFile, JSON.stringify(exportObject, null, 4));

    console.log(`Config written to ${appConfiguration.outFile}.`);
}

/**
 * Sync all configs from selected config
 * 
 */
async function syncConfig(): Promise<any> {
    // Select a config to syncronize from
    const result = await selectConfigDir("Which config would you like to sync from?");
    return confirm("Are you sure you want to sync?").then(() => {
        const configPath = join(appConfiguration.userDataPath, result, appConfiguration.appId, appConfiguration.cfgRelativePath);
        const configFiles = getMatchingFiles(configPath, SUPPORTED_CONFIG_FILES);

        const configObject: IConfigObject = {};

        // Grab all the config files from the source directory
        configFiles.forEach(file => {
            const filename = basename(file);
            configObject[filename] = fs.readFileSync(file, "utf8");
        });

        // Write the config
        writeConfig(configObject);

        console.log("Configs have been syncronized.");
    })
}

/**
 * Helper function to write config object to all supported config directories
 * 
 * @param {IConfigObject} configObject 
 */
function writeConfig(configObject: IConfigObject) {
    // Write this file to all config directories
    getDirectories(appConfiguration.userDataPath).forEach(value => {
        for (const file in configObject) {
            fs.writeFileSync(join(appConfiguration.userDataPath, value, appConfiguration.appId, appConfiguration.cfgRelativePath, file), configObject[file]);
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
function confirm(message: string, confirmedFunction?: Function): Promise<boolean> {
    return new Promise((resolve, reject) => {
        inquirer.prompt({ type: "confirm", name: "confirm", message }).then(answer => {
            if (answer) {
                if (confirmedFunction) confirmedFunction();
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
async function selectConfigDir(message: string) {
    // Get all the config directories
    let configDirs = getDirectories(appConfiguration.userDataPath);

    const files: any = {};
    const playerSummaries: any = {};

    // Get player summaries so we can show account name next to steamid
    if (appConfiguration.steamApiKey) {
        const response = await getPlayerSummaries(PLAYER_SUMMARIES_API_URL, appConfiguration.steamApiKey, configDirs) as any[];

        response.forEach(summary => {
            playerSummaries[summary.steamid] = summary;
        });
    }

    const choices: string[] = [];

    // If there is a player summary for this ID, add the account name to the choice
    configDirs.forEach(value => {
        if (playerSummaries[convertTo64BitId(value)]) {
            choices.push(`${value} [${playerSummaries[convertTo64BitId(value)].personaname}]`);
        }
        else {
            choices.push(value);
        }
    });

    // Prompt user for directory
    return inquirer.prompt([{ type: "list", name: "source", message, choices }]).then(answers => answers.source.split(" ")[0]);
}

/**
 * Entry function
 * 
 * @export
 */
export default function () {
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

    const choices: inquirer.ChoiceType[] = [{
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
    }

    // Prompt the user for the initial option
    inquirer.prompt([{
        type: "list", name: "option", message: "Please select an option", choices: choices
    }]).then((answers) => {
        return registeredHandlers[answers.option as EApplicationOptions]();
    }).then(() => {
        // Application complete, cleanup
        console.log("Done.");
    });
}

