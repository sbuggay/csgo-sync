import * as request from "request";
import * as fs from "fs";

import * as inquirer from "inquirer";

import { join, basename } from "path";

// TODO: turn these into command line arguments
const APP_ID = 730;
const STEAM_API_KEY = process.env.STEAM_API_KEY || null;
const BIT_SHIFT: number = 61197960265728;
const PLAYER_SUMMARIES_API_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
const OUT_FILE_NAME = "config.json";

const resources = {
    import: "Import from file",
    importweb: "Import from URL",
    export: "Export config",
    sync: "Syncronize configs"
}

interface IConfigObject {
    [key: string]: string;
}

enum EApplicationOptions {
    IMPORT = "IMPORT",
    IMPORTWEB = "IMPORTWEB",
    EXPORT = "EXPORT",
    SYNC = "SYNC"
}

/**
 * Utility function to convert 32bit steamids to 64bit
 * 
 * @param {any} id 
 * @returns 
 */
function convertTo64BitId(id: string): string {
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
async function getPlayerSummaries(ids: string[]): Promise<any> {
    if (ids && ids.length && ids.length > 0) {
        const url = `${PLAYER_SUMMARIES_API_URL}/?key=${STEAM_API_KEY}&steamids=${ids.map(convertTo64BitId).join(",")}`;
        request(url, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }
            return JSON.parse(body).response.players;
        });
    }
    else {
        return [];
    }
}
/**
 * Utilty function to determine if path is a directory
 * 
 * @param {any} path 
 * @returns 
 */
function isDirectory(path: string): boolean {
    return fs.lstatSync(path).isDirectory();
}

/**
 * Gets all files that match the config file mask
 * 
 * @param {any} path 
 * @returns 
 */
function getConfigFiles(path: string): string[] {
    return fs.readdirSync(path).filter(name => configFiles.indexOf(name) !== -1).map(value => join(path, value));
}

/**
 * Utility function to get directories of a given path
 * 
 * @param {any} path 
 * @returns 
 */
function getDirectories(path: string): string[] {
    return fs.readdirSync(path).filter(name => isDirectory(join(userDataPath, name)));
}

/**
 * Import config from file
 * 
 */
function importConfig(): void {
    inquirer.prompt([{ type: "input", name: "path", message: "Please enter the path of your config: " }]).then((answers) => {
        const configObject: IConfigObject = JSON.parse(fs.readFileSync(answers.path).toString());

        console.log(configObject);

        // Ask for user confirmation
        confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?").then(() => {
            writeConfig(configObject)

            console.log("Configs have been written.");
        });
    });
}

/**
 * Import config from a URL and use the body as the config object
 * 
 */
function importConfigWeb(): void {
    inquirer.prompt([{ type: "input", name: "url", message: "Please enter the URL of your config: " }]).then((answers) => {
        request(answers.url as string, (error, response, body) => {
            if (error) {
                throw new Error(error);
            }

            const configObject: IConfigObject = JSON.parse(body);

            console.log(configObject);

            // Ask for user confirmation
            confirm("Here is the config file we parsed, please make sure nothing looks suspicious. Continue?").then(() => {
                writeConfig(configObject)

                console.log("Configs have been written.");
            });
        });
    });
}

/**
 * Export all configs to single json string
 * 
 */
async function exportConfig() {
    // Select config directory to export
    const result = await selectConfigDir("Which config would you like to export?")
    const configPath = join(userDataPath, result, cfgRelativePath);
    const configFiles = getConfigFiles(configPath);

    const exportObject: IConfigObject = {};

    // Read in config files
    configFiles.forEach(file => {
        const filename = basename(file);
        exportObject[filename] = fs.readFileSync(file, "utf8");
    });

    // Write serialized config file out
    fs.writeFileSync(OUT_FILE_NAME, JSON.stringify(exportObject, null, 4));

    console.log(`Config written to ${OUT_FILE_NAME}}.`);
}

/**
 * Sync all configs from selected config
 * 
 */
async function sync() {
    // Select a config to syncronize from
    const result = await selectConfigDir("Which config would you like to sync from?");
    confirm("Are you sure you want to sync?").then(() => {
        const configPath = join(userDataPath, result, cfgRelativePath);
        const configFiles = getConfigFiles(configPath);

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
    getDirectories(userDataPath).forEach(value => {
        for (const file in configObject) {
            fs.writeFileSync(join(userDataPath, value, cfgRelativePath, file), configObject[file]);
        }
    });
}

/**
 * Helper function to ask for confirmation
 * 
 * @param {string} message 
 * @returns {Promise<boolean>} 
 */
function confirm(message: string): Promise<boolean> {
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
async function selectConfigDir(message: string) {
    // Get all the config directories
    let configDirs = getDirectories(userDataPath);

    const files: any = {};
    const playerSummaries: any = {};

    // Get player summaries so we can show account name next to steamid
    if (STEAM_API_KEY) {
        const response = await getPlayerSummaries(configDirs) as any[];

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
    return inquirer.prompt([{ type: "list", name: "source", message, choices }]).then(answers => {
        const id = answers.source.split(" ")[0];
        return id;
    });
}

function main(option: EApplicationOptions) {
    switch (option) {
        case EApplicationOptions.EXPORT:
            exportConfig();
            break;
        case EApplicationOptions.IMPORT:
            importConfig();
            break;
        case EApplicationOptions.IMPORTWEB:
            importConfigWeb();
            break;
        case EApplicationOptions.SYNC:
            sync();
            break;
    }
}

const choices: inquirer.ChoiceType[] = [
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

// Prompt the user for the initial option
inquirer.prompt([{
    type: "list", name: "option", message: "Please select an option", choices: choices
}]).then((answers) => {
    main(answers.option);
});

