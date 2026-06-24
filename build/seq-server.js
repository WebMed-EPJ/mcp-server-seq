#!/usr/bin/env node
import{createRequire as __cr}from'module';const require=__cr(import.meta.url);
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require3() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/dotenv/package.json
var require_package = __commonJS({
  "node_modules/dotenv/package.json"(exports, module) {
    module.exports = {
      name: "dotenv",
      version: "16.4.7",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports, module) {
    var fs2 = __require("fs");
    var path2 = __require("path");
    var os = __require("os");
    var crypto = __require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      const vaultPath = _vaultPath(options);
      const result = DotenvModule.configDotenv({ path: vaultPath });
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _log(message) {
      console.log(`[dotenv@${version}][INFO] ${message}`);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs2.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path2.resolve(process.cwd(), ".env.vault");
      }
      if (fs2.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path2.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      _log("Loading env from encrypted .env.vault");
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path2.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path3 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs2.readFileSync(path3, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path3} ${e.message}`);
          }
          lastError = e;
        }
      }
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsedAll, options);
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
        }
      }
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// node_modules/dotenv/lib/env-options.js
var require_env_options = __commonJS({
  "node_modules/dotenv/lib/env-options.js"(exports, module) {
    var options = {};
    if (process.env.DOTENV_CONFIG_ENCODING != null) {
      options.encoding = process.env.DOTENV_CONFIG_ENCODING;
    }
    if (process.env.DOTENV_CONFIG_PATH != null) {
      options.path = process.env.DOTENV_CONFIG_PATH;
    }
    if (process.env.DOTENV_CONFIG_DEBUG != null) {
      options.debug = process.env.DOTENV_CONFIG_DEBUG;
    }
    if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
      options.override = process.env.DOTENV_CONFIG_OVERRIDE;
    }
    if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
      options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
    }
    module.exports = options;
  }
});

// node_modules/dotenv/lib/cli-options.js
var require_cli_options = __commonJS({
  "node_modules/dotenv/lib/cli-options.js"(exports, module) {
    var re = /^dotenv_config_(encoding|path|debug|override|DOTENV_KEY)=(.+)$/;
    module.exports = function optionMatcher(args) {
      return args.reduce(function(acc, cur) {
        const matches = cur.match(re);
        if (matches) {
          acc[matches[1]] = matches[2];
        }
        return acc;
      }, {});
    };
  }
});

// node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
var LATEST_PROTOCOL_VERSION = "2024-11-05";
var SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-10-07"
];
var JSONRPC_VERSION = "2.0";
var ProgressTokenSchema = z.union([z.string(), z.number().int()]);
var CursorSchema = z.string();
var BaseRequestParamsSchema = z.object({
  _meta: z.optional(z.object({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: z.optional(ProgressTokenSchema)
  }).passthrough())
}).passthrough();
var RequestSchema = z.object({
  method: z.string(),
  params: z.optional(BaseRequestParamsSchema)
});
var BaseNotificationParamsSchema = z.object({
  /**
   * This parameter name is reserved by MCP to allow clients and servers to attach additional metadata to their notifications.
   */
  _meta: z.optional(z.object({}).passthrough())
}).passthrough();
var NotificationSchema = z.object({
  method: z.string(),
  params: z.optional(BaseNotificationParamsSchema)
});
var ResultSchema = z.object({
  /**
   * This result property is reserved by the protocol to allow clients and servers to attach additional metadata to their responses.
   */
  _meta: z.optional(z.object({}).passthrough())
}).passthrough();
var RequestIdSchema = z.union([z.string(), z.number().int()]);
var JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema
}).merge(RequestSchema).strict();
var JSONRPCNotificationSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION)
}).merge(NotificationSchema).strict();
var JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  error: z.object({
    /**
     * The error type that occurred.
     */
    code: z.number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: z.string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: z.optional(z.unknown())
  })
}).strict();
var JSONRPCMessageSchema = z.union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema
]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/cancelled"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: RequestIdSchema,
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: z.string().optional()
  })
});
var ImplementationSchema = z.object({
  name: z.string(),
  version: z.string()
}).passthrough();
var ClientCapabilitiesSchema = z.object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: z.optional(z.object({}).passthrough()),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: z.optional(z.object({}).passthrough()),
  /**
   * Present if the client supports listing roots.
   */
  roots: z.optional(z.object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: z.optional(z.boolean())
  }).passthrough())
}).passthrough();
var InitializeRequestSchema = RequestSchema.extend({
  method: z.literal("initialize"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: z.string(),
    capabilities: ClientCapabilitiesSchema,
    clientInfo: ImplementationSchema
  })
});
var ServerCapabilitiesSchema = z.object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: z.optional(z.object({}).passthrough()),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: z.optional(z.object({}).passthrough()),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: z.optional(z.object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: z.optional(z.boolean())
  }).passthrough()),
  /**
   * Present if the server offers any resources to read.
   */
  resources: z.optional(z.object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: z.optional(z.boolean()),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: z.optional(z.boolean())
  }).passthrough()),
  /**
   * Present if the server offers any tools to call.
   */
  tools: z.optional(z.object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: z.optional(z.boolean())
  }).passthrough())
}).passthrough();
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: z.string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: z.optional(z.string())
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/initialized")
});
var PingRequestSchema = RequestSchema.extend({
  method: z.literal("ping")
});
var ProgressSchema = z.object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: z.number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: z.optional(z.number())
}).passthrough();
var ProgressNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/progress"),
  params: BaseNotificationParamsSchema.merge(ProgressSchema).extend({
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressTokenSchema
  })
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: BaseRequestParamsSchema.extend({
    /**
     * An opaque token representing the current pagination position.
     * If provided, the server should return results starting after this cursor.
     */
    cursor: z.optional(CursorSchema)
  }).optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: z.optional(CursorSchema)
});
var ResourceContentsSchema = z.object({
  /**
   * The URI of this resource.
   */
  uri: z.string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z.optional(z.string())
}).passthrough();
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: z.string()
});
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: z.string().base64()
});
var ResourceSchema = z.object({
  /**
   * The URI of this resource.
   */
  uri: z.string(),
  /**
   * A human-readable name for this resource.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z.string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z.optional(z.string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z.optional(z.string())
}).passthrough();
var ResourceTemplateSchema = z.object({
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: z.string(),
  /**
   * A human-readable name for the type of resource this template refers to.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z.string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z.optional(z.string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: z.optional(z.string())
}).passthrough();
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: z.literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: z.array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: z.literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: z.array(ResourceTemplateSchema)
});
var ReadResourceRequestSchema = RequestSchema.extend({
  method: z.literal("resources/read"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: z.string()
  })
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: z.array(z.union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/resources/list_changed")
});
var SubscribeRequestSchema = RequestSchema.extend({
  method: z.literal("resources/subscribe"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: z.string()
  })
});
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: z.literal("resources/unsubscribe"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to unsubscribe from.
     */
    uri: z.string()
  })
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/resources/updated"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: z.string()
  })
});
var PromptArgumentSchema = z.object({
  /**
   * The name of the argument.
   */
  name: z.string(),
  /**
   * A human-readable description of the argument.
   */
  description: z.optional(z.string()),
  /**
   * Whether this argument must be provided.
   */
  required: z.optional(z.boolean())
}).passthrough();
var PromptSchema = z.object({
  /**
   * The name of the prompt or prompt template.
   */
  name: z.string(),
  /**
   * An optional description of what this prompt provides
   */
  description: z.optional(z.string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: z.optional(z.array(PromptArgumentSchema))
}).passthrough();
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: z.literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: z.array(PromptSchema)
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: z.literal("prompts/get"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The name of the prompt or prompt template.
     */
    name: z.string(),
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: z.optional(z.record(z.string()))
  })
});
var TextContentSchema = z.object({
  type: z.literal("text"),
  /**
   * The text content of the message.
   */
  text: z.string()
}).passthrough();
var ImageContentSchema = z.object({
  type: z.literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: z.string().base64(),
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: z.string()
}).passthrough();
var EmbeddedResourceSchema = z.object({
  type: z.literal("resource"),
  resource: z.union([TextResourceContentsSchema, BlobResourceContentsSchema])
}).passthrough();
var PromptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    TextContentSchema,
    ImageContentSchema,
    EmbeddedResourceSchema
  ])
}).passthrough();
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: z.optional(z.string()),
  messages: z.array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/prompts/list_changed")
});
var ToolSchema = z.object({
  /**
   * The name of the tool.
   */
  name: z.string(),
  /**
   * A human-readable description of the tool.
   */
  description: z.optional(z.string()),
  /**
   * A JSON Schema object defining the expected parameters for the tool.
   */
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.optional(z.object({}).passthrough())
  }).passthrough()
}).passthrough();
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: z.literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: z.array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  content: z.array(z.union([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema])),
  isError: z.boolean().default(false).optional()
});
var CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({
  toolResult: z.unknown()
}));
var CallToolRequestSchema = RequestSchema.extend({
  method: z.literal("tools/call"),
  params: BaseRequestParamsSchema.extend({
    name: z.string(),
    arguments: z.optional(z.record(z.unknown()))
  })
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/tools/list_changed")
});
var LoggingLevelSchema = z.enum([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
]);
var SetLevelRequestSchema = RequestSchema.extend({
  method: z.literal("logging/setLevel"),
  params: BaseRequestParamsSchema.extend({
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: LoggingLevelSchema
  })
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/message"),
  params: BaseNotificationParamsSchema.extend({
    /**
     * The severity of this log message.
     */
    level: LoggingLevelSchema,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: z.optional(z.string()),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: z.unknown()
  })
});
var ModelHintSchema = z.object({
  /**
   * A hint for a model name.
   */
  name: z.string().optional()
}).passthrough();
var ModelPreferencesSchema = z.object({
  /**
   * Optional hints to use for model selection.
   */
  hints: z.optional(z.array(ModelHintSchema)),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: z.optional(z.number().min(0).max(1)),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: z.optional(z.number().min(0).max(1)),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: z.optional(z.number().min(0).max(1))
}).passthrough();
var SamplingMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([TextContentSchema, ImageContentSchema])
}).passthrough();
var CreateMessageRequestSchema = RequestSchema.extend({
  method: z.literal("sampling/createMessage"),
  params: BaseRequestParamsSchema.extend({
    messages: z.array(SamplingMessageSchema),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: z.optional(z.string()),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
     */
    includeContext: z.optional(z.enum(["none", "thisServer", "allServers"])),
    temperature: z.optional(z.number()),
    /**
     * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
     */
    maxTokens: z.number().int(),
    stopSequences: z.optional(z.array(z.string())),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: z.optional(z.object({}).passthrough()),
    /**
     * The server's preferences for which model to select.
     */
    modelPreferences: z.optional(ModelPreferencesSchema)
  })
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: z.string(),
  /**
   * The reason why sampling stopped.
   */
  stopReason: z.optional(z.enum(["endTurn", "stopSequence", "maxTokens"]).or(z.string())),
  role: z.enum(["user", "assistant"]),
  content: z.discriminatedUnion("type", [
    TextContentSchema,
    ImageContentSchema
  ])
});
var ResourceReferenceSchema = z.object({
  type: z.literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: z.string()
}).passthrough();
var PromptReferenceSchema = z.object({
  type: z.literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: z.string()
}).passthrough();
var CompleteRequestSchema = RequestSchema.extend({
  method: z.literal("completion/complete"),
  params: BaseRequestParamsSchema.extend({
    ref: z.union([PromptReferenceSchema, ResourceReferenceSchema]),
    /**
     * The argument's information
     */
    argument: z.object({
      /**
       * The name of the argument
       */
      name: z.string(),
      /**
       * The value of the argument to use for completion matching.
       */
      value: z.string()
    }).passthrough()
  })
});
var CompleteResultSchema = ResultSchema.extend({
  completion: z.object({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: z.array(z.string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: z.optional(z.number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: z.optional(z.boolean())
  }).passthrough()
});
var RootSchema = z.object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: z.string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: z.optional(z.string())
}).passthrough();
var ListRootsRequestSchema = RequestSchema.extend({
  method: z.literal("roots/list")
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: z.array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/roots/list_changed")
});
var ClientRequestSchema = z.union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema
]);
var ClientNotificationSchema = z.union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema
]);
var ClientResultSchema = z.union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  ListRootsResultSchema
]);
var ServerRequestSchema = z.union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ListRootsRequestSchema
]);
var ServerNotificationSchema = z.union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema
]);
var ServerResultSchema = z.union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema
]);
var McpError = class extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js
var DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4;
var Protocol = class {
  constructor(_options) {
    this._options = _options;
    this._requestMessageId = 0;
    this._requestHandlers = /* @__PURE__ */ new Map();
    this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
    this._notificationHandlers = /* @__PURE__ */ new Map();
    this._responseHandlers = /* @__PURE__ */ new Map();
    this._progressHandlers = /* @__PURE__ */ new Map();
    this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
      const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
      controller === null || controller === void 0 ? void 0 : controller.abort(notification.params.reason);
    });
    this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      this._onprogress(notification);
    });
    this.setRequestHandler(
      PingRequestSchema,
      // Automatic pong by default.
      (_request) => ({})
    );
  }
  /**
   * Attaches to the given transport, starts it, and starts listening for messages.
   *
   * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
   */
  async connect(transport) {
    this._transport = transport;
    this._transport.onclose = () => {
      this._onclose();
    };
    this._transport.onerror = (error) => {
      this._onerror(error);
    };
    this._transport.onmessage = (message) => {
      if (!("method" in message)) {
        this._onresponse(message);
      } else if ("id" in message) {
        this._onrequest(message);
      } else {
        this._onnotification(message);
      }
    };
    await this._transport.start();
  }
  _onclose() {
    var _a;
    const responseHandlers = this._responseHandlers;
    this._responseHandlers = /* @__PURE__ */ new Map();
    this._progressHandlers.clear();
    this._transport = void 0;
    (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
    const error = new McpError(ErrorCode.ConnectionClosed, "Connection closed");
    for (const handler of responseHandlers.values()) {
      handler(error);
    }
  }
  _onerror(error) {
    var _a;
    (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
  }
  _onnotification(notification) {
    var _a;
    const handler = (_a = this._notificationHandlers.get(notification.method)) !== null && _a !== void 0 ? _a : this.fallbackNotificationHandler;
    if (handler === void 0) {
      return;
    }
    Promise.resolve().then(() => handler(notification)).catch((error) => this._onerror(new Error(`Uncaught error in notification handler: ${error}`)));
  }
  _onrequest(request) {
    var _a, _b;
    const handler = (_a = this._requestHandlers.get(request.method)) !== null && _a !== void 0 ? _a : this.fallbackRequestHandler;
    if (handler === void 0) {
      (_b = this._transport) === null || _b === void 0 ? void 0 : _b.send({
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: ErrorCode.MethodNotFound,
          message: "Method not found"
        }
      }).catch((error) => this._onerror(new Error(`Failed to send an error response: ${error}`)));
      return;
    }
    const abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request.id, abortController);
    Promise.resolve().then(() => handler(request, { signal: abortController.signal })).then((result) => {
      var _a2;
      if (abortController.signal.aborted) {
        return;
      }
      return (_a2 = this._transport) === null || _a2 === void 0 ? void 0 : _a2.send({
        result,
        jsonrpc: "2.0",
        id: request.id
      });
    }, (error) => {
      var _a2, _b2;
      if (abortController.signal.aborted) {
        return;
      }
      return (_a2 = this._transport) === null || _a2 === void 0 ? void 0 : _a2.send({
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: Number.isSafeInteger(error["code"]) ? error["code"] : ErrorCode.InternalError,
          message: (_b2 = error.message) !== null && _b2 !== void 0 ? _b2 : "Internal error"
        }
      });
    }).catch((error) => this._onerror(new Error(`Failed to send response: ${error}`))).finally(() => {
      this._requestHandlerAbortControllers.delete(request.id);
    });
  }
  _onprogress(notification) {
    const { progressToken, ...params } = notification.params;
    const handler = this._progressHandlers.get(Number(progressToken));
    if (handler === void 0) {
      this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
      return;
    }
    handler(params);
  }
  _onresponse(response) {
    const messageId = response.id;
    const handler = this._responseHandlers.get(Number(messageId));
    if (handler === void 0) {
      this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(Number(messageId));
    this._progressHandlers.delete(Number(messageId));
    if ("result" in response) {
      handler(response);
    } else {
      const error = new McpError(response.error.code, response.error.message, response.error.data);
      handler(error);
    }
  }
  get transport() {
    return this._transport;
  }
  /**
   * Closes the connection.
   */
  async close() {
    var _a;
    await ((_a = this._transport) === null || _a === void 0 ? void 0 : _a.close());
  }
  /**
   * Sends a request and wait for a response.
   *
   * Do not use this method to emit notifications! Use notification() instead.
   */
  request(request, resultSchema, options) {
    return new Promise((resolve, reject) => {
      var _a, _b, _c, _d;
      if (!this._transport) {
        reject(new Error("Not connected"));
        return;
      }
      if (((_a = this._options) === null || _a === void 0 ? void 0 : _a.enforceStrictCapabilities) === true) {
        this.assertCapabilityForMethod(request.method);
      }
      (_b = options === null || options === void 0 ? void 0 : options.signal) === null || _b === void 0 ? void 0 : _b.throwIfAborted();
      const messageId = this._requestMessageId++;
      const jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId
      };
      if (options === null || options === void 0 ? void 0 : options.onprogress) {
        this._progressHandlers.set(messageId, options.onprogress);
        jsonrpcRequest.params = {
          ...request.params,
          _meta: { progressToken: messageId }
        };
      }
      let timeoutId = void 0;
      this._responseHandlers.set(messageId, (response) => {
        var _a2;
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        if ((_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0 ? void 0 : _a2.aborted) {
          return;
        }
        if (response instanceof Error) {
          return reject(response);
        }
        try {
          const result = resultSchema.parse(response.result);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      const cancel = (reason) => {
        var _a2;
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        (_a2 = this._transport) === null || _a2 === void 0 ? void 0 : _a2.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: {
            requestId: messageId,
            reason: String(reason)
          }
        }).catch((error) => this._onerror(new Error(`Failed to send cancellation: ${error}`)));
        reject(reason);
      };
      (_c = options === null || options === void 0 ? void 0 : options.signal) === null || _c === void 0 ? void 0 : _c.addEventListener("abort", () => {
        var _a2;
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        cancel((_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0 ? void 0 : _a2.reason);
      });
      const timeout = (_d = options === null || options === void 0 ? void 0 : options.timeout) !== null && _d !== void 0 ? _d : DEFAULT_REQUEST_TIMEOUT_MSEC;
      timeoutId = setTimeout(() => cancel(new McpError(ErrorCode.RequestTimeout, "Request timed out", {
        timeout
      })), timeout);
      this._transport.send(jsonrpcRequest).catch((error) => {
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }
  /**
   * Emits a notification, which is a one-way message that does not expect a response.
   */
  async notification(notification) {
    if (!this._transport) {
      throw new Error("Not connected");
    }
    this.assertNotificationCapability(notification.method);
    const jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0"
    };
    await this._transport.send(jsonrpcNotification);
  }
  /**
   * Registers a handler to invoke when this protocol object receives a request with the given method.
   *
   * Note that this will replace any previous request handler for the same method.
   */
  setRequestHandler(requestSchema, handler) {
    const method = requestSchema.shape.method.value;
    this.assertRequestHandlerCapability(method);
    this._requestHandlers.set(method, (request, extra) => Promise.resolve(handler(requestSchema.parse(request), extra)));
  }
  /**
   * Removes the request handler for the given method.
   */
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }
  /**
   * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
   */
  assertCanSetRequestHandler(method) {
    if (this._requestHandlers.has(method)) {
      throw new Error(`A request handler for ${method} already exists, which would be overridden`);
    }
  }
  /**
   * Registers a handler to invoke when this protocol object receives a notification with the given method.
   *
   * Note that this will replace any previous notification handler for the same method.
   */
  setNotificationHandler(notificationSchema, handler) {
    this._notificationHandlers.set(notificationSchema.shape.method.value, (notification) => Promise.resolve(handler(notificationSchema.parse(notification))));
  }
  /**
   * Removes the notification handler for the given method.
   */
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
};
function mergeCapabilities(base, additional) {
  return Object.entries(additional).reduce((acc, [key, value]) => {
    if (value && typeof value === "object") {
      acc[key] = acc[key] ? { ...acc[key], ...value } : value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, { ...base });
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js
var Server = class extends Protocol {
  /**
   * Initializes this server with the given name and version information.
   */
  constructor(_serverInfo, options) {
    var _a;
    super(options);
    this._serverInfo = _serverInfo;
    this._capabilities = (_a = options === null || options === void 0 ? void 0 : options.capabilities) !== null && _a !== void 0 ? _a : {};
    this._instructions = options === null || options === void 0 ? void 0 : options.instructions;
    this.setRequestHandler(InitializeRequestSchema, (request) => this._oninitialize(request));
    this.setNotificationHandler(InitializedNotificationSchema, () => {
      var _a2;
      return (_a2 = this.oninitialized) === null || _a2 === void 0 ? void 0 : _a2.call(this);
    });
  }
  /**
   * Registers new capabilities. This can only be called before connecting to a transport.
   *
   * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
   */
  registerCapabilities(capabilities) {
    if (this.transport) {
      throw new Error("Cannot register capabilities after connecting to transport");
    }
    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
  }
  assertCapabilityForMethod(method) {
    var _a, _b;
    switch (method) {
      case "sampling/createMessage":
        if (!((_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.sampling)) {
          throw new Error(`Client does not support sampling (required for ${method})`);
        }
        break;
      case "roots/list":
        if (!((_b = this._clientCapabilities) === null || _b === void 0 ? void 0 : _b.roots)) {
          throw new Error(`Client does not support listing roots (required for ${method})`);
        }
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/message":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support notifying about resources (required for ${method})`);
        }
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
        }
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
        }
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._capabilities.sampling) {
          throw new Error(`Server does not support sampling (required for ${method})`);
        }
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support prompts (required for ${method})`);
        }
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support resources (required for ${method})`);
        }
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support tools (required for ${method})`);
        }
        break;
      case "ping":
      case "initialize":
        break;
    }
  }
  async _oninitialize(request) {
    const requestedVersion = request.params.protocolVersion;
    this._clientCapabilities = request.params.capabilities;
    this._clientVersion = request.params.clientInfo;
    return {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION,
      capabilities: this.getCapabilities(),
      serverInfo: this._serverInfo,
      ...this._instructions && { instructions: this._instructions }
    };
  }
  /**
   * After initialization has completed, this will be populated with the client's reported capabilities.
   */
  getClientCapabilities() {
    return this._clientCapabilities;
  }
  /**
   * After initialization has completed, this will be populated with information about the client's name and version.
   */
  getClientVersion() {
    return this._clientVersion;
  }
  getCapabilities() {
    return this._capabilities;
  }
  async ping() {
    return this.request({ method: "ping" }, EmptyResultSchema);
  }
  async createMessage(params, options) {
    return this.request({ method: "sampling/createMessage", params }, CreateMessageResultSchema, options);
  }
  async listRoots(params, options) {
    return this.request({ method: "roots/list", params }, ListRootsResultSchema, options);
  }
  async sendLoggingMessage(params) {
    return this.notification({ method: "notifications/message", params });
  }
  async sendResourceUpdated(params) {
    return this.notification({
      method: "notifications/resources/updated",
      params
    });
  }
  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed"
    });
  }
  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }
  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }
};

// node_modules/zod-to-json-schema/dist/esm/Options.js
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref"
};
var getDefaultOptions = (options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
};

// node_modules/zod-to-json-schema/dist/esm/Refs.js
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
};

// node_modules/zod-to-json-schema/dist/esm/errorMessages.js
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/any.js
function parseAnyDef() {
  return {};
}

// node_modules/zod-to-json-schema/dist/esm/parsers/array.js
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/zod-to-json-schema/dist/esm/parsers/date.js
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
var integerDateParser = (def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
};

// node_modules/zod-to-json-schema/dist/esm/parsers/default.js
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : {};
}

// node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/string.js
var emojiRegex2 = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: () => {
    if (emojiRegex2 === void 0) {
      emojiRegex2 = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex2;
  },
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
function addFormat(schema, value, message, refs) {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
function parseRecordDef(def, refs) {
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? {}
      }), {}),
      additionalProperties: false
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? {}
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || {};
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || {};
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/never.js
function parseNeverDef() {
  return {
    not: {}
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/null.js
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/union.js
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [
        ...acc,
        ...x._def.values.filter((x2) => !acc.includes(x2))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
};

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/number.js
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/object.js
function decideAdditionalProperties(def, refs) {
  if (refs.removeAdditionalStrategy === "strict") {
    return def.catchall._def.typeName === "ZodNever" ? def.unknownKeys !== "strict" : parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? true;
  } else {
    return def.catchall._def.typeName === "ZodNever" ? def.unknownKeys === "passthrough" : parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? true;
  }
}
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
  const result = {
    type: "object",
    ...Object.entries(def.shape()).reduce((acc, [propName, propDef]) => {
      if (propDef === void 0 || propDef._def === void 0)
        return acc;
      let propOptional = propDef.isOptional();
      if (propOptional && forceOptionalIntoNullable) {
        if (propDef instanceof ZodOptional) {
          propDef = propDef._def.innerType;
        }
        if (!propDef.isNullable()) {
          propDef = propDef.nullable();
        }
        propOptional = false;
      }
      const parsedDef = parseDef(propDef._def, {
        ...refs,
        currentPath: [...refs.currentPath, "properties", propName],
        propertyPath: [...refs.currentPath, "properties", propName]
      });
      if (parsedDef === void 0)
        return acc;
      return {
        properties: { ...acc.properties, [propName]: parsedDef },
        required: propOptional ? acc.required : [...acc.required, propName]
      };
    }, { properties: {}, required: [] }),
    additionalProperties: decideAdditionalProperties(def, refs)
  };
  if (!result.required.length)
    delete result.required;
  return result;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
var parseOptionalDef = (def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: {}
      },
      innerSchema
    ]
  } : {};
};

// node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
var parsePipelineDef = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
};

// node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/set.js
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}

// node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
function parseUndefinedDef() {
  return {
    not: {}
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
function parseUnknownDef() {
  return {};
}

// node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
function parseDef(def, refs, forceResolution = false) {
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchema = selectParser(def, def.typeName, refs);
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
var get$ref = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return {};
      }
      return refs.$refStrategy === "seen" ? {} : void 0;
    }
  }
};
var getRelativePath = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
var selectParser = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return parseDef(def.getter()._def, refs);
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)(typeName);
  }
};
var addMeta = (def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
};

// node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
var zodToJsonSchema = (schema, options) => {
  const refs = getRefs(options);
  const definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
    ...acc,
    [name2]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name2]
    }, true) ?? {}
  }), {}) : void 0;
  const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? {};
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  const combined = name === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/completable.js
var McpZodTypeKind;
(function(McpZodTypeKind2) {
  McpZodTypeKind2["Completable"] = "McpCompletable";
})(McpZodTypeKind || (McpZodTypeKind = {}));
var Completable = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
Completable.create = (type, params) => {
  return new Completable({
    type,
    typeName: McpZodTypeKind.Completable,
    complete: params.complete,
    ...processCreateParams2(params)
  });
};
function processCreateParams2(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js
var McpServer = class {
  constructor(serverInfo, options) {
    this._registeredResources = {};
    this._registeredResourceTemplates = {};
    this._registeredTools = {};
    this._registeredPrompts = {};
    this._toolHandlersInitialized = false;
    this._completionHandlerInitialized = false;
    this._resourceHandlersInitialized = false;
    this._promptHandlersInitialized = false;
    this.server = new Server(serverInfo, options);
  }
  /**
   * Attaches to the given transport, starts it, and starts listening for messages.
   *
   * The `server` object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
   */
  async connect(transport) {
    return await this.server.connect(transport);
  }
  /**
   * Closes the connection.
   */
  async close() {
    await this.server.close();
  }
  setToolRequestHandlers() {
    if (this._toolHandlersInitialized) {
      return;
    }
    this.server.assertCanSetRequestHandler(ListToolsRequestSchema.shape.method.value);
    this.server.assertCanSetRequestHandler(CallToolRequestSchema.shape.method.value);
    this.server.registerCapabilities({
      tools: {}
    });
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: Object.entries(this._registeredTools).map(([name, tool]) => {
        return {
          name,
          description: tool.description,
          inputSchema: tool.inputSchema ? zodToJsonSchema(tool.inputSchema) : EMPTY_OBJECT_JSON_SCHEMA
        };
      })
    }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const tool = this._registeredTools[request.params.name];
      if (!tool) {
        throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
      }
      if (tool.inputSchema) {
        const parseResult = await tool.inputSchema.safeParseAsync(request.params.arguments);
        if (!parseResult.success) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid arguments for tool ${request.params.name}: ${parseResult.error.message}`);
        }
        const args = parseResult.data;
        const cb = tool.callback;
        try {
          return await Promise.resolve(cb(args, extra));
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: error instanceof Error ? error.message : String(error)
              }
            ],
            isError: true
          };
        }
      } else {
        const cb = tool.callback;
        try {
          return await Promise.resolve(cb(extra));
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: error instanceof Error ? error.message : String(error)
              }
            ],
            isError: true
          };
        }
      }
    });
    this._toolHandlersInitialized = true;
  }
  setCompletionRequestHandler() {
    if (this._completionHandlerInitialized) {
      return;
    }
    this.server.assertCanSetRequestHandler(CompleteRequestSchema.shape.method.value);
    this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
      switch (request.params.ref.type) {
        case "ref/prompt":
          return this.handlePromptCompletion(request, request.params.ref);
        case "ref/resource":
          return this.handleResourceCompletion(request, request.params.ref);
        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid completion reference: ${request.params.ref}`);
      }
    });
    this._completionHandlerInitialized = true;
  }
  async handlePromptCompletion(request, ref) {
    const prompt = this._registeredPrompts[ref.name];
    if (!prompt) {
      throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.ref.name} not found`);
    }
    if (!prompt.argsSchema) {
      return EMPTY_COMPLETION_RESULT;
    }
    const field = prompt.argsSchema.shape[request.params.argument.name];
    if (!(field instanceof Completable)) {
      return EMPTY_COMPLETION_RESULT;
    }
    const def = field._def;
    const suggestions = await def.complete(request.params.argument.value);
    return createCompletionResult(suggestions);
  }
  async handleResourceCompletion(request, ref) {
    const template = Object.values(this._registeredResourceTemplates).find((t) => t.resourceTemplate.uriTemplate.toString() === ref.uri);
    if (!template) {
      if (this._registeredResources[ref.uri]) {
        return EMPTY_COMPLETION_RESULT;
      }
      throw new McpError(ErrorCode.InvalidParams, `Resource template ${request.params.ref.uri} not found`);
    }
    const completer = template.resourceTemplate.completeCallback(request.params.argument.name);
    if (!completer) {
      return EMPTY_COMPLETION_RESULT;
    }
    const suggestions = await completer(request.params.argument.value);
    return createCompletionResult(suggestions);
  }
  setResourceRequestHandlers() {
    if (this._resourceHandlersInitialized) {
      return;
    }
    this.server.assertCanSetRequestHandler(ListResourcesRequestSchema.shape.method.value);
    this.server.assertCanSetRequestHandler(ListResourceTemplatesRequestSchema.shape.method.value);
    this.server.assertCanSetRequestHandler(ReadResourceRequestSchema.shape.method.value);
    this.server.registerCapabilities({
      resources: {}
    });
    this.server.setRequestHandler(ListResourcesRequestSchema, async (request, extra) => {
      const resources = Object.entries(this._registeredResources).map(([uri, resource]) => ({
        uri,
        name: resource.name,
        ...resource.metadata
      }));
      const templateResources = [];
      for (const template of Object.values(this._registeredResourceTemplates)) {
        if (!template.resourceTemplate.listCallback) {
          continue;
        }
        const result = await template.resourceTemplate.listCallback(extra);
        for (const resource of result.resources) {
          templateResources.push({
            ...resource,
            ...template.metadata
          });
        }
      }
      return { resources: [...resources, ...templateResources] };
    });
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      const resourceTemplates = Object.entries(this._registeredResourceTemplates).map(([name, template]) => ({
        name,
        uriTemplate: template.resourceTemplate.uriTemplate.toString(),
        ...template.metadata
      }));
      return { resourceTemplates };
    });
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
      const uri = new URL(request.params.uri);
      const resource = this._registeredResources[uri.toString()];
      if (resource) {
        return resource.readCallback(uri, extra);
      }
      for (const template of Object.values(this._registeredResourceTemplates)) {
        const variables = template.resourceTemplate.uriTemplate.match(uri.toString());
        if (variables) {
          return template.readCallback(uri, variables, extra);
        }
      }
      throw new McpError(ErrorCode.InvalidParams, `Resource ${uri} not found`);
    });
    this.setCompletionRequestHandler();
    this._resourceHandlersInitialized = true;
  }
  setPromptRequestHandlers() {
    if (this._promptHandlersInitialized) {
      return;
    }
    this.server.assertCanSetRequestHandler(ListPromptsRequestSchema.shape.method.value);
    this.server.assertCanSetRequestHandler(GetPromptRequestSchema.shape.method.value);
    this.server.registerCapabilities({
      prompts: {}
    });
    this.server.setRequestHandler(ListPromptsRequestSchema, () => ({
      prompts: Object.entries(this._registeredPrompts).map(([name, prompt]) => {
        return {
          name,
          description: prompt.description,
          arguments: prompt.argsSchema ? promptArgumentsFromSchema(prompt.argsSchema) : void 0
        };
      })
    }));
    this.server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
      const prompt = this._registeredPrompts[request.params.name];
      if (!prompt) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} not found`);
      }
      if (prompt.argsSchema) {
        const parseResult = await prompt.argsSchema.safeParseAsync(request.params.arguments);
        if (!parseResult.success) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid arguments for prompt ${request.params.name}: ${parseResult.error.message}`);
        }
        const args = parseResult.data;
        const cb = prompt.callback;
        return await Promise.resolve(cb(args, extra));
      } else {
        const cb = prompt.callback;
        return await Promise.resolve(cb(extra));
      }
    });
    this.setCompletionRequestHandler();
    this._promptHandlersInitialized = true;
  }
  resource(name, uriOrTemplate, ...rest) {
    let metadata;
    if (typeof rest[0] === "object") {
      metadata = rest.shift();
    }
    const readCallback = rest[0];
    if (typeof uriOrTemplate === "string") {
      if (this._registeredResources[uriOrTemplate]) {
        throw new Error(`Resource ${uriOrTemplate} is already registered`);
      }
      this._registeredResources[uriOrTemplate] = {
        name,
        metadata,
        readCallback
      };
    } else {
      if (this._registeredResourceTemplates[name]) {
        throw new Error(`Resource template ${name} is already registered`);
      }
      this._registeredResourceTemplates[name] = {
        resourceTemplate: uriOrTemplate,
        metadata,
        readCallback
      };
    }
    this.setResourceRequestHandlers();
  }
  tool(name, ...rest) {
    if (this._registeredTools[name]) {
      throw new Error(`Tool ${name} is already registered`);
    }
    let description;
    if (typeof rest[0] === "string") {
      description = rest.shift();
    }
    let paramsSchema;
    if (rest.length > 1) {
      paramsSchema = rest.shift();
    }
    const cb = rest[0];
    this._registeredTools[name] = {
      description,
      inputSchema: paramsSchema === void 0 ? void 0 : z.object(paramsSchema),
      callback: cb
    };
    this.setToolRequestHandlers();
  }
  prompt(name, ...rest) {
    if (this._registeredPrompts[name]) {
      throw new Error(`Prompt ${name} is already registered`);
    }
    let description;
    if (typeof rest[0] === "string") {
      description = rest.shift();
    }
    let argsSchema;
    if (rest.length > 1) {
      argsSchema = rest.shift();
    }
    const cb = rest[0];
    this._registeredPrompts[name] = {
      description,
      argsSchema: argsSchema === void 0 ? void 0 : z.object(argsSchema),
      callback: cb
    };
    this.setPromptRequestHandlers();
  }
};
var EMPTY_OBJECT_JSON_SCHEMA = {
  type: "object"
};
function promptArgumentsFromSchema(schema) {
  return Object.entries(schema.shape).map(([name, field]) => ({
    name,
    description: field.description,
    required: !field.isOptional()
  }));
}
function createCompletionResult(suggestions) {
  return {
    completion: {
      values: suggestions.slice(0, 100),
      total: suggestions.length,
      hasMore: suggestions.length > 100
    }
  };
}
var EMPTY_COMPLETION_RESULT = {
  completion: {
    values: [],
    hasMore: false
  }
};

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
import process2 from "node:process";

// node_modules/@modelcontextprotocol/sdk/dist/esm/shared/stdio.js
var ReadBuffer = class {
  append(chunk) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this._buffer) {
      return null;
    }
    const index = this._buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }
    const line = this._buffer.toString("utf8", 0, index);
    this._buffer = this._buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this._buffer = void 0;
  }
};
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}

// node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js
var StdioServerTransport = class {
  constructor(_stdin = process2.stdin, _stdout = process2.stdout) {
    this._stdin = _stdin;
    this._stdout = _stdout;
    this._readBuffer = new ReadBuffer();
    this._started = false;
    this._ondata = (chunk) => {
      this._readBuffer.append(chunk);
      this.processReadBuffer();
    };
    this._onerror = (error) => {
      var _a;
      (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
    };
  }
  /**
   * Starts listening for messages on stdin.
   */
  async start() {
    if (this._started) {
      throw new Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");
    }
    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }
  processReadBuffer() {
    var _a, _b;
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) {
          break;
        }
        (_a = this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, message);
      } catch (error) {
        (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
      }
    }
  }
  async close() {
    var _a;
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);
    const remainingDataListeners = this._stdin.listenerCount("data");
    if (remainingDataListeners === 0) {
      this._stdin.pause();
    }
    this._readBuffer.clear();
    (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
  }
  send(message) {
    return new Promise((resolve) => {
      const json = serializeMessage(message);
      if (this._stdout.write(json)) {
        resolve();
      } else {
        this._stdout.once("drain", resolve);
      }
    });
  }
};

// node_modules/dotenv/config.js
(function() {
  require_main().config(
    Object.assign(
      {},
      require_env_options(),
      require_cli_options()(process.argv)
    )
  );
})();

// node_modules/openredaction/dist/index.mjs
import { createRequire } from "node:module";
import * as fs from "fs";
import * as path from "path";
import { join as join2 } from "path";
import { Worker } from "worker_threads";
import { cpus } from "os";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __exportAll = (all, symbols) => {
  let target = {};
  for (var name in all) {
    __defProp(target, name, {
      get: all[name],
      enumerable: true
    });
  }
  if (symbols) {
    __defProp(target, Symbol.toStringTag, { value: "Module" });
  }
  return target;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (var keys = __getOwnPropNames2(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp.call(to, key) && key !== except) {
        __defProp(to, key, {
          get: ((k) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
      }
    }
  }
  return to;
};
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __require2 = /* @__PURE__ */ createRequire(import.meta.url);
var InMemoryAuditLogger = class {
  constructor(maxLogs = 1e4) {
    this.logs = [];
    this.maxLogs = maxLogs;
  }
  /**
  * Log an audit entry
  */
  log(entry) {
    const auditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.logs.push(auditEntry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
  }
  /**
  * Get all audit logs
  */
  getLogs() {
    return [...this.logs];
  }
  /**
  * Get audit logs filtered by operation type
  */
  getLogsByOperation(operation) {
    return this.logs.filter((log) => log.operation === operation);
  }
  /**
  * Get audit logs filtered by date range
  */
  getLogsByDateRange(startDate, endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return this.logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  }
  /**
  * Export audit logs as JSON
  */
  exportAsJson() {
    return JSON.stringify(this.logs, null, 2);
  }
  /**
  * Export audit logs as CSV
  */
  exportAsCsv() {
    if (this.logs.length === 0) return "id,timestamp,operation,piiCount,piiTypes,textLength,processingTimeMs,redactionMode,success,error,user,sessionId\n";
    const headers = [
      "id",
      "timestamp",
      "operation",
      "piiCount",
      "piiTypes",
      "textLength",
      "processingTimeMs",
      "redactionMode",
      "success",
      "error",
      "user",
      "sessionId"
    ];
    const rows = this.logs.map((log) => {
      return [
        this.escapeCsv(log.id),
        this.escapeCsv(log.timestamp),
        this.escapeCsv(log.operation),
        log.piiCount.toString(),
        this.escapeCsv(log.piiTypes.join(";")),
        log.textLength.toString(),
        log.processingTimeMs.toFixed(2),
        this.escapeCsv(log.redactionMode || ""),
        log.success.toString(),
        this.escapeCsv(log.error || ""),
        this.escapeCsv(log.user || ""),
        this.escapeCsv(log.sessionId || "")
      ].join(",");
    });
    return headers.join(",") + "\n" + rows.join("\n");
  }
  /**
  * Clear all audit logs
  */
  clear() {
    this.logs = [];
  }
  /**
  * Get audit statistics
  */
  getStats() {
    if (this.logs.length === 0) return {
      totalOperations: 0,
      totalPiiDetected: 0,
      averageProcessingTime: 0,
      topPiiTypes: [],
      operationsByType: {},
      successRate: 0
    };
    const totalOperations = this.logs.length;
    const totalPiiDetected = this.logs.reduce((sum, log) => sum + log.piiCount, 0);
    const averageProcessingTime = this.logs.reduce((sum, log) => sum + log.processingTimeMs, 0) / totalOperations;
    const successRate = this.logs.filter((log) => log.success).length / totalOperations;
    const piiTypeCount = /* @__PURE__ */ new Map();
    this.logs.forEach((log) => {
      log.piiTypes.forEach((type) => {
        piiTypeCount.set(type, (piiTypeCount.get(type) || 0) + 1);
      });
    });
    const topPiiTypes = Array.from(piiTypeCount.entries()).map(([type, count]) => ({
      type,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 10);
    const operationsByType = {};
    this.logs.forEach((log) => {
      operationsByType[log.operation] = (operationsByType[log.operation] || 0) + 1;
    });
    return {
      totalOperations,
      totalPiiDetected,
      averageProcessingTime,
      topPiiTypes,
      operationsByType,
      successRate
    };
  }
  /**
  * Generate a unique ID for audit entries
  */
  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
  * Escape CSV values
  */
  escapeCsv(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }
};
var InMemoryMetricsCollector = class {
  constructor() {
    this.metrics = this.createEmptyMetrics();
  }
  /**
  * Create empty metrics object
  */
  createEmptyMetrics() {
    return {
      totalRedactions: 0,
      totalPiiDetected: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      totalTextLength: 0,
      piiByType: {},
      byRedactionMode: {},
      totalErrors: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
  * Record a redaction operation
  */
  recordRedaction(result, processingTimeMs, redactionMode) {
    this.metrics.totalRedactions++;
    this.metrics.totalPiiDetected += result.detections.length;
    this.metrics.totalProcessingTime += processingTimeMs;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.totalRedactions;
    this.metrics.totalTextLength += result.original.length;
    for (const detection of result.detections) this.metrics.piiByType[detection.type] = (this.metrics.piiByType[detection.type] || 0) + 1;
    this.metrics.byRedactionMode[redactionMode] = (this.metrics.byRedactionMode[redactionMode] || 0) + 1;
    this.metrics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  }
  /**
  * Record an error
  */
  recordError() {
    this.metrics.totalErrors++;
    this.metrics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  }
  /**
  * Get metrics exporter
  */
  getExporter() {
    return this;
  }
  /**
  * Get current metrics snapshot
  */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
  * Reset all metrics
  */
  reset() {
    this.metrics = this.createEmptyMetrics();
  }
  /**
  * Export metrics in Prometheus format
  */
  exportPrometheus(metrics = this.metrics, prefix = "openredaction") {
    const lines = [];
    const timestamp = Date.now();
    lines.push(`# HELP ${prefix}_total_redactions Total number of redaction operations`);
    lines.push(`# TYPE ${prefix}_total_redactions counter`);
    lines.push(`${prefix}_total_redactions ${metrics.totalRedactions} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_total_pii_detected Total number of PII items detected`);
    lines.push(`# TYPE ${prefix}_total_pii_detected counter`);
    lines.push(`${prefix}_total_pii_detected ${metrics.totalPiiDetected} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_avg_processing_time_ms Average processing time in milliseconds`);
    lines.push(`# TYPE ${prefix}_avg_processing_time_ms gauge`);
    lines.push(`${prefix}_avg_processing_time_ms ${metrics.averageProcessingTime.toFixed(2)} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_total_processing_time_ms Total processing time in milliseconds`);
    lines.push(`# TYPE ${prefix}_total_processing_time_ms counter`);
    lines.push(`${prefix}_total_processing_time_ms ${metrics.totalProcessingTime.toFixed(2)} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_total_text_length Total text length processed in characters`);
    lines.push(`# TYPE ${prefix}_total_text_length counter`);
    lines.push(`${prefix}_total_text_length ${metrics.totalTextLength} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_pii_by_type PII detection counts by type`);
    lines.push(`# TYPE ${prefix}_pii_by_type counter`);
    for (const [type, count] of Object.entries(metrics.piiByType)) lines.push(`${prefix}_pii_by_type{type="${type}"} ${count} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_by_redaction_mode Operation counts by redaction mode`);
    lines.push(`# TYPE ${prefix}_by_redaction_mode counter`);
    for (const [mode, count] of Object.entries(metrics.byRedactionMode)) lines.push(`${prefix}_by_redaction_mode{mode="${mode}"} ${count} ${timestamp}`);
    lines.push("");
    lines.push(`# HELP ${prefix}_total_errors Total number of errors`);
    lines.push(`# TYPE ${prefix}_total_errors counter`);
    lines.push(`${prefix}_total_errors ${metrics.totalErrors} ${timestamp}`);
    lines.push("");
    return lines.join("\n");
  }
  /**
  * Export metrics in StatsD format
  */
  exportStatsD(metrics = this.metrics, prefix = "openredaction") {
    const lines = [];
    lines.push(`${prefix}.total_redactions:${metrics.totalRedactions}|c`);
    lines.push(`${prefix}.total_pii_detected:${metrics.totalPiiDetected}|c`);
    lines.push(`${prefix}.total_processing_time_ms:${metrics.totalProcessingTime.toFixed(2)}|c`);
    lines.push(`${prefix}.total_text_length:${metrics.totalTextLength}|c`);
    lines.push(`${prefix}.total_errors:${metrics.totalErrors}|c`);
    lines.push(`${prefix}.avg_processing_time_ms:${metrics.averageProcessingTime.toFixed(2)}|g`);
    for (const [type, count] of Object.entries(metrics.piiByType)) lines.push(`${prefix}.pii_by_type:${count}|c|#type:${type}`);
    for (const [mode, count] of Object.entries(metrics.byRedactionMode)) lines.push(`${prefix}.by_redaction_mode:${count}|c|#mode:${mode}`);
    return lines;
  }
};
var ALL_PERMISSIONS = [
  "pattern:read",
  "pattern:write",
  "pattern:delete",
  "detection:detect",
  "detection:redact",
  "detection:restore",
  "audit:read",
  "audit:export",
  "audit:delete",
  "metrics:read",
  "metrics:export",
  "metrics:reset",
  "config:read",
  "config:write"
];
var ADMIN_ROLE = {
  name: "admin",
  description: "Administrator with full access to all operations",
  permissions: ALL_PERMISSIONS
};
var ANALYST_ROLE = {
  name: "analyst",
  description: "Data analyst with detection, audit, and metrics access",
  permissions: [
    "pattern:read",
    "detection:detect",
    "detection:redact",
    "detection:restore",
    "audit:read",
    "audit:export",
    "metrics:read",
    "metrics:export",
    "config:read"
  ]
};
var OPERATOR_ROLE = {
  name: "operator",
  description: "Operator with detection and limited audit/metrics access",
  permissions: [
    "pattern:read",
    "detection:detect",
    "detection:redact",
    "audit:read",
    "metrics:read"
  ]
};
var VIEWER_ROLE = {
  name: "viewer",
  description: "Read-only viewer with no execution permissions",
  permissions: [
    "pattern:read",
    "audit:read",
    "audit:export",
    "metrics:read",
    "metrics:export",
    "config:read"
  ]
};
function getPredefinedRole(roleName) {
  switch (roleName.toLowerCase()) {
    case "admin":
      return ADMIN_ROLE;
    case "analyst":
      return ANALYST_ROLE;
    case "operator":
      return OPERATOR_ROLE;
    case "viewer":
      return VIEWER_ROLE;
    default:
      return;
  }
}
var RBACManager = class {
  constructor(role = ADMIN_ROLE) {
    this.role = role;
  }
  /**
  * Check if current role has a specific permission
  */
  hasPermission(permission) {
    return this.role.permissions.includes(permission);
  }
  /**
  * Check if current role has all specified permissions
  */
  hasAllPermissions(permissions) {
    return permissions.every((permission) => this.hasPermission(permission));
  }
  /**
  * Check if current role has any of the specified permissions
  */
  hasAnyPermission(permissions) {
    return permissions.some((permission) => this.hasPermission(permission));
  }
  /**
  * Get current role
  */
  getRole() {
    return { ...this.role };
  }
  /**
  * Set role (updates permissions)
  */
  setRole(role) {
    this.role = role;
  }
  /**
  * Get all permissions for current role
  */
  getPermissions() {
    return [...this.role.permissions];
  }
  /**
  * Filter patterns based on read permissions
  * Returns empty array if user lacks pattern:read permission
  */
  filterPatterns(patterns) {
    if (!this.hasPermission("pattern:read")) return [];
    return patterns;
  }
};
function validateLuhn(cardNumber, _context) {
  const cleaned = cardNumber.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) return false;
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}
function validateIBAN(iban, _context) {
  const cleaned = iban.replace(/[\s\u00A0.-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(cleaned)) return false;
  const expectedLength = {
    AD: 24,
    AE: 23,
    AL: 28,
    AT: 20,
    AZ: 28,
    BA: 20,
    BE: 16,
    BG: 22,
    BH: 22,
    BR: 29,
    CH: 21,
    CR: 21,
    CY: 28,
    CZ: 24,
    DE: 22,
    DK: 18,
    DO: 28,
    EE: 20,
    ES: 24,
    FI: 18,
    FO: 18,
    FR: 27,
    GB: 22,
    GE: 22,
    GI: 23,
    GL: 18,
    GR: 27,
    GT: 28,
    HR: 21,
    HU: 28,
    IE: 22,
    IL: 23,
    IS: 26,
    IT: 27,
    JO: 30,
    KW: 30,
    KZ: 20,
    LB: 28,
    LI: 21,
    LT: 20,
    LU: 20,
    LV: 21,
    MC: 27,
    MD: 24,
    ME: 22,
    MK: 19,
    MR: 27,
    MT: 31,
    MU: 30,
    NL: 18,
    NO: 15,
    PK: 24,
    PL: 28,
    PS: 29,
    PT: 25,
    QA: 29,
    RO: 24,
    RS: 22,
    SA: 24,
    SE: 24,
    SI: 19,
    SK: 24,
    SM: 27,
    TN: 24,
    TR: 26,
    UA: 29,
    VA: 22,
    VG: 24,
    XK: 20
  }[cleaned.substring(0, 2)];
  if (!expectedLength || cleaned.length !== expectedLength) return false;
  return mod97((cleaned.substring(4) + cleaned.substring(0, 4)).replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString())) === 1;
}
function mod97(string) {
  let remainder = 0;
  for (let i = 0; i < string.length; i++) remainder = (remainder * 10 + parseInt(string[i], 10)) % 97;
  return remainder;
}
function validateNINO(nino, _context) {
  const cleaned = nino.replace(/[\s\u00A0.-]/g, "").toUpperCase();
  if (!/^[A-CEGHJ-PR-TW-Z]{2}[0-9]{6}[A-D]$/.test(cleaned)) return false;
  const invalidPrefixes = [
    "BG",
    "GB",
    "NK",
    "KN",
    "TN",
    "NT",
    "ZZ"
  ];
  const prefix = cleaned.substring(0, 2);
  return !invalidPrefixes.includes(prefix);
}
function validateNHS(nhs, _context) {
  const cleaned = nhs.replace(/[\s\u00A0.-]/g, "");
  if (!/^\d{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i], 10) * (10 - i);
  const checkDigit = 11 - sum % 11;
  return (checkDigit === 11 ? 0 : checkDigit) === parseInt(cleaned[9], 10) && checkDigit !== 10;
}
function validateUKPassport(passport, _context) {
  const cleaned = passport.replace(/[\s\u00A0.-]/g, "").toUpperCase();
  return /^\d{9}$/.test(cleaned) || /^\d{3}\d{6}$/.test(cleaned);
}
function validateSSN(ssn, _context) {
  const cleaned = ssn.replace(/[\s\u00A0.-]/g, "");
  if (!/^\d{9}$/.test(cleaned)) return false;
  const area = cleaned.substring(0, 3);
  const group = cleaned.substring(3, 5);
  const serial = cleaned.substring(5, 9);
  if (area === "000" || area === "666" || parseInt(area, 10) >= 900) return false;
  if (group === "00" || serial === "0000") return false;
  return ![
    "111111111",
    "222222222",
    "333333333",
    "444444444",
    "555555555",
    "666666666",
    "777777777",
    "888888888",
    "999999999"
  ].includes(cleaned);
}
function validateSortCode(sortCode, _context) {
  const cleaned = sortCode.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(cleaned);
}
function validateRoutingNumber(routingNumber, _context) {
  const cleaned = routingNumber.replace(/[\s\u00A0.-]/g, "");
  if (!/^\d{9}$/.test(cleaned)) return false;
  const digits = cleaned.split("").map(Number);
  return (3 * (digits[0] + digits[3] + digits[6]) + 7 * (digits[1] + digits[4] + digits[7]) + (digits[2] + digits[5] + digits[8])) % 10 === 0;
}
function validateName(name, context) {
  const businessTerms = [
    "account",
    "company",
    "limited",
    "ltd",
    "inc",
    "corp",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "mr",
    "mrs",
    "ms",
    "dr",
    "sir",
    "madam",
    "lord",
    "lady",
    "personal",
    "sensitive",
    "information",
    "data",
    "details",
    "content",
    "document",
    "text",
    "example",
    "simple",
    "regular",
    "plain",
    "send",
    "reply",
    "reach",
    "write",
    "use",
    "contact",
    "message"
  ];
  const nameLower = name.toLowerCase();
  if (businessTerms.some((term) => nameLower === term || nameLower.includes(term))) return false;
  if (name === name.toUpperCase() && name.length <= 5) return false;
  if (name.length === 1) return false;
  const contextLower = context.toLowerCase();
  if (contextLower.includes("company ") || contextLower.includes("business ") || contextLower.includes("organization") || contextLower.includes("without any") || contextLower.includes("simple text") || contextLower.includes("plain text")) return false;
  return true;
}
function validateEmail(email, _context) {
  if (!/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email)) return false;
  const [local, domain] = email.split("@");
  if (local.length > 64 || domain.length > 255) return false;
  if (!domain.includes(".")) return false;
  return true;
}
var personalPatterns = [
  {
    type: "EMAIL",
    regex: /\b[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\b/g,
    priority: 100,
    validator: (value, context) => {
      if (!validateEmail(value)) return false;
      const rejectKeywords = /your\.email|placeholder|fake/i;
      const isLegitimateTest = /test|sample|demo|spec|api|reference|guide|template|documentation/i.test(context);
      if (rejectKeywords.test(context) && !isLegitimateTest) return false;
      if (/@test\.com|@example\.com|@sample\.com|@demo\.com|@fake\.com|@placeholder\.com/i.test(value)) {
        if (!/test|spec|api|reference|guide|template|documentation|john\+|!!!|\+tag|john@/i.test(context + value)) return false;
      }
      return true;
    },
    placeholder: "[EMAIL_{n}]",
    description: "Email address",
    severity: "high"
  },
  {
    type: "NAME",
    regex: /\b(?:(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Sir|Madam|Lady|Lord|Rev|Father|Sister|Brother)\.?\s+)?((?:[A-Z][a-z'’.\-]+|[A-Z]{2,})(?:\s+(?:[A-Z][a-z'’.\-]+|[A-Z]{2,}|[a-z][a-z'’.\-]+)){1,3})(?:\s+(?:Jr|Sr|II|III|IV|PhD|MD|Esq|DDS|DVM|MBA|CPA)\.?)?\b/g,
    priority: 50,
    validator: (value, context) => {
      if (!validateName(value, context)) return false;
      const rejectKeywords = /example|test|sample|demo|fake|placeholder|john\s+doe|jane\s+smith/i;
      if (rejectKeywords.test(context) || rejectKeywords.test(value)) return false;
      if (/\b(company|corporation|inc|llc|ltd|corp|organization|business|enterprise|firm|agency)\b/i.test(context)) return false;
      return true;
    },
    placeholder: "[NAME_{n}]",
    description: "Person name with salutations/suffixes (handles case variations)",
    severity: "high"
  },
  {
    type: "EMPLOYEE_ID",
    regex: /\b(?:EMP|EMPL|EMPLOYEE)[_\s-]?(?:ID|NUM(?:BER)?)?[:\s-]*([A-Z0-9]{4,10})\b/gi,
    priority: 90,
    placeholder: "[EMPLOYEE_ID_{n}]",
    description: "Employee ID",
    severity: "medium"
  },
  {
    type: "USERNAME",
    regex: /\b(?:user(?:name)?|login)[:\s]+([a-zA-Z0-9_-]{3,20})\b/gi,
    priority: 85,
    placeholder: "[USERNAME_{n}]",
    description: "Username",
    severity: "medium"
  },
  {
    type: "DATE_OF_BIRTH",
    regex: /\b(?:DOB|date of birth|birth ?date)[:\s-]*((?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(?:\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}))\b/gi,
    priority: 95,
    placeholder: "[DOB_{n}]",
    description: "Date of birth",
    severity: "high",
    validator: (value, context) => {
      if (!/dob|date\s+of\s+birth|birth\s+date|birth/i.test(context)) return false;
      const dateStr = value.replace(/[\s]/g, "");
      const datePattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
      const monthNames = {
        jan: 1,
        feb: 2,
        mar: 3,
        apr: 4,
        may: 5,
        jun: 6,
        jul: 7,
        aug: 8,
        sep: 9,
        oct: 10,
        nov: 11,
        dec: 12,
        january: 1,
        february: 2,
        march: 3,
        april: 4,
        june: 6,
        july: 7,
        august: 8,
        september: 9,
        october: 10,
        november: 11,
        december: 12
      };
      let month, day, year;
      if (datePattern.test(dateStr)) {
        const match = dateStr.match(datePattern);
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
        if (month > 12 && day <= 12) [month, day] = [day, month];
      } else {
        const match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2,4})/i);
        if (match) {
          day = parseInt(match[1]);
          month = monthNames[match[2].toLowerCase()];
          year = parseInt(match[3]);
        } else return false;
      }
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      if (year < 1900 || year > currentYear) return false;
      const daysInMonth = [
        31,
        28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
      ];
      if (month === 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[1] = 29;
      if (day > daysInMonth[month - 1]) return false;
      if (new Date(year < 100 ? 2e3 + year : year, month - 1, day) > /* @__PURE__ */ new Date()) return false;
      if (/example|test|sample|demo|fake|placeholder/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "DATE",
    regex: /\b((?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(?:\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}))\b/gi,
    priority: 60,
    placeholder: "[DATE_{n}]",
    description: "Date (standalone, without DOB context)",
    severity: "medium",
    validator: (value, context) => {
      if (/^(19|20)\d{2}$/.test(value.replace(/[\/\-.\s]/g, ""))) return false;
      if (/\b(version|v\d+|release|build|update)\s*[:\s]*/i.test(context)) return false;
      return true;
    }
  }
];
var financialPatterns = [
  {
    type: "CREDIT_CARD",
    regex: /(?<!\d)(?:(?:\d{4}[\s\u00A0.-]?){3}\d{4}|\d{4}[\s\u00A0.-]?\d{6}[\s\u00A0.-]?\d{5})(?!\d)/g,
    priority: 100,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{13,19}$/.test(cleaned)) return false;
      const isTestValue = /4532-1234-5678-9010|4532123456789010/.test(match);
      if (!validateLuhn(cleaned) && !isTestValue) return false;
      const rejectKeywords = /example\s+card|test\s+card|sample\s+card|demo\s+card|fake\s+card/i;
      const allowTestValues = /4532-1234-5678-9010|4532123456789010/i.test(match);
      if (rejectKeywords.test(context) && !allowTestValues) return false;
      return true;
    },
    placeholder: "[CREDIT_CARD_{n}]",
    description: "Credit card number",
    severity: "high"
  },
  {
    type: "IBAN",
    regex: /\b([A-Z]{2}\d{2}(?:[ \u00A0.-]?[A-Z0-9]){11,30})\b/gi,
    priority: 95,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (!/^[A-Z]{2}\d{2}/.test(cleaned)) return false;
      if (!validateIBAN(cleaned)) return false;
      if (/example\s+iban|test\s+iban|sample\s+iban|demo\s+iban|fake\s+iban/i.test(context)) return false;
      return true;
    },
    placeholder: "[IBAN_{n}]",
    description: "IBAN bank account",
    severity: "high"
  },
  {
    type: "BANK_ACCOUNT_UK",
    regex: /\b(?:account|acc|a\/c)[:\s#-]*((?:\d{4}[\s\u00A0-]?\d{4})|(?:\d{2}[\s\u00A0-]?\d{2}[\s\u00A0-]?\d{4}))\b/gi,
    priority: 90,
    placeholder: "[BANK_ACCOUNT_{n}]",
    description: "UK bank account number",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{8}$/.test(cleaned) && !/^\d{10}$/.test(cleaned)) return false;
      if (!/account|bank|sort\s+code|financial|payment|transfer|deposit|withdrawal/i.test(context)) return false;
      if (/example\s+account|test\s+account|sample\s+account|demo\s+account|fake\s+account/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "SORT_CODE_UK",
    regex: /\b(?:sort[\s\u00A0-]*code|SC)[:\s\u00A0.-]*((?:\d{2}[\s\u00A0.-]?){2}\d{2})\b/gi,
    priority: 90,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{6}$/.test(cleaned)) return false;
      if (!validateSortCode(cleaned)) return false;
      if (/example\s+sort|test\s+sort|sample\s+sort|demo\s+sort|fake\s+sort/i.test(context)) return false;
      return true;
    },
    placeholder: "[SORT_CODE_{n}]",
    description: "UK sort code",
    severity: "high"
  },
  {
    type: "ROUTING_NUMBER_US",
    regex: /\b(?:routing|RTN|ABA)[-\s\u00A0]*(?:number|no|num)?[-\s\u00A0.:#]*((?:\d[\s\u00A0.-]?){9})\b/gi,
    priority: 90,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{9}$/.test(cleaned)) return false;
      if (!validateRoutingNumber(cleaned)) return false;
      if (/example\s+routing|test\s+routing|sample\s+routing|demo\s+routing|fake\s+routing/i.test(context)) return false;
      return true;
    },
    placeholder: "[ROUTING_NUMBER_{n}]",
    description: "US routing number",
    severity: "high"
  },
  {
    type: "CVV",
    regex: /\b(?:CVV|CVC|CSC|CVN)[:\s\u00A0]*(\d{3,4})\b/gi,
    priority: 95,
    placeholder: "[CVV_{n}]",
    description: "Card security code",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{3,4}$/.test(cleaned)) return false;
      if (/^(19|20)\d{2}$/.test(cleaned)) {
        const contextLower = context.toLowerCase();
        if (/\b(year|date|expir|valid)\b/i.test(contextLower)) return false;
      }
      return true;
    }
  },
  {
    type: "IFSC",
    regex: /\b([A-Z]{4})[-\s\u00A0.]?0[-\s\u00A0.]?([A-Z0-9]{6})\b/gi,
    priority: 90,
    placeholder: "[IFSC_{n}]",
    description: "Indian Financial System Code",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) return false;
      if (!/ifsc|bank|india|in|financial|payment|transfer/i.test(context)) return false;
      if (/example\s+ifsc|test\s+ifsc|sample\s+ifsc|demo\s+ifsc|fake\s+ifsc/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "CLABE",
    regex: /\b\d{18}\b/g,
    priority: 85,
    validator: (match) => {
      if (match.length !== 18) return false;
      const weights = [
        3,
        7,
        1,
        3,
        7,
        1,
        3,
        7,
        1,
        3,
        7,
        1,
        3,
        7,
        1,
        3,
        7
      ];
      let sum = 0;
      for (let i = 0; i < 17; i++) sum += parseInt(match[i]) * weights[i];
      return (10 - sum % 10) % 10 === parseInt(match[17]);
    },
    placeholder: "[CLABE_{n}]",
    description: "Mexican CLABE bank account number",
    severity: "high"
  },
  {
    type: "BSB_AU",
    regex: /\b(?:BSB)[:\s\u00A0]*(\d{3}[\s\u00A0-]?\d{3})\b/gi,
    priority: 90,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{6}$/.test(cleaned)) return false;
      if (!/bsb|bank|australia|au|financial|payment|transfer/i.test(context)) return false;
      if (/example\s+bsb|test\s+bsb|sample\s+bsb|demo\s+bsb|fake\s+bsb/i.test(context)) return false;
      return true;
    },
    placeholder: "[BSB_{n}]",
    description: "Australian Bank State Branch number",
    severity: "high"
  },
  {
    type: "ISIN",
    regex: /\b[A-Z]{2}[A-Z0-9]{9}\d\b/g,
    priority: 85,
    validator: (match) => {
      if (match.length !== 12) return false;
      let numStr = "";
      for (let i = 0; i < match.length - 1; i++) {
        const char = match[i];
        if (char >= "A" && char <= "Z") numStr += (char.charCodeAt(0) - 55).toString();
        else numStr += char;
      }
      let sum = 0;
      let alternate = false;
      for (let i = numStr.length - 1; i >= 0; i--) {
        let digit = parseInt(numStr[i]);
        if (alternate) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        alternate = !alternate;
      }
      return (10 - sum % 10) % 10 === parseInt(match[11]);
    },
    placeholder: "[ISIN_{n}]",
    description: "International Securities Identification Number",
    severity: "medium"
  },
  {
    type: "CUSIP",
    regex: /\b[A-Z0-9]{9}\b/g,
    priority: 80,
    validator: (match) => {
      if (match.length !== 9) return false;
      let sum = 0;
      for (let i = 0; i < 8; i++) {
        let value;
        const char = match[i];
        if (char >= "0" && char <= "9") value = parseInt(char);
        else if (char >= "A" && char <= "Z") value = char.charCodeAt(0) - 55;
        else return false;
        if (i % 2 !== 0) value *= 2;
        sum += Math.floor(value / 10) + value % 10;
      }
      return (10 - sum % 10) % 10 === parseInt(match[8]);
    },
    placeholder: "[CUSIP_{n}]",
    description: "CUSIP securities identifier",
    severity: "medium"
  },
  {
    type: "SEDOL",
    regex: /\b[B-DF-HJ-NP-TV-Z0-9]{6}\d\b/g,
    priority: 80,
    validator: (match) => {
      if (match.length !== 7) return false;
      const weights = [
        1,
        3,
        1,
        7,
        3,
        9
      ];
      let sum = 0;
      for (let i = 0; i < 6; i++) {
        const char = match[i];
        let value;
        if (char >= "0" && char <= "9") value = parseInt(char);
        else value = char.charCodeAt(0) - 55;
        sum += value * weights[i];
      }
      return (10 - sum % 10) % 10 === parseInt(match[6]);
    },
    placeholder: "[SEDOL_{n}]",
    description: "Stock Exchange Daily Official List identifier",
    severity: "medium"
  },
  {
    type: "LEI",
    regex: /\b[A-Z0-9]{20}\b/g,
    priority: 75,
    validator: (match) => {
      if (match.length !== 20) return false;
      let numStr = "";
      for (const char of match) if (char >= "0" && char <= "9") numStr += char;
      else if (char >= "A" && char <= "Z") numStr += (char.charCodeAt(0) - 55).toString();
      else return false;
      const checkDigits = parseInt(numStr.slice(-2));
      const baseNumber = numStr.slice(0, -2);
      let remainder = 0;
      for (const digit of baseNumber) remainder = (remainder * 10 + parseInt(digit)) % 97;
      return 98 - remainder === checkDigits;
    },
    placeholder: "[LEI_{n}]",
    description: "Legal Entity Identifier",
    severity: "medium"
  }
];
var governmentPatterns = [
  {
    type: "SSN",
    regex: /\b(?:SSN|social\s+security)\b[:\s\u00A0#-]*([0-9]{3}[\s\u00A0.-]?[0-9]{2}[\s\u00A0.-]?[0-9]{4})\b/gi,
    priority: 100,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{9}$/.test(cleaned)) return false;
      if (!validateSSN(cleaned)) return false;
      const usContext = /ssn|social\s+security|us\b|usa|american|government|tax|irs|federal/i;
      const isTestMode = context.includes("SSN:") || context.includes("123-45-6789");
      if (!usContext.test(context) && !isTestMode) return false;
      const rejectKeywords = /example\s+ssn|test\s+ssn|sample\s+ssn|demo\s+ssn|fake\s+ssn/i;
      const allowTestValues = /123-45-6789|111-11-1111/i.test(match);
      if (rejectKeywords.test(context) && !allowTestValues) return false;
      return true;
    },
    placeholder: "[SSN_{n}]",
    description: "US Social Security Number",
    severity: "high"
  },
  {
    type: "PASSPORT_UK",
    regex: /\b(?:passport|pass)[:\s\u00A0#-]*((?:\d{3}[\s\u00A0.-]?){2}\d{3})\b/gi,
    priority: 95,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{9}$/.test(cleaned)) return false;
      if (!validateUKPassport(cleaned)) return false;
      if (!/passport|uk\b|british|gb|government|border|travel|immigration/i.test(context)) return false;
      if (/example\s+passport|test\s+passport|sample\s+passport|demo\s+passport|fake\s+passport/i.test(context)) return false;
      return true;
    },
    placeholder: "[PASSPORT_{n}]",
    description: "UK Passport number",
    severity: "high"
  },
  {
    type: "PASSPORT_US",
    regex: /\b(?:passport|pass)[:\s\u00A0#-]*(([A-Z0-9][\s\u00A0.-]?){5,8}[A-Z0-9])\b/gi,
    priority: 95,
    placeholder: "[PASSPORT_{n}]",
    description: "US Passport number",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (cleaned.length < 6 || cleaned.length > 9) return false;
      if (!/^[PE]/.test(cleaned)) return false;
      if (!/passport|us\b|usa|american|government|state\s+department|border|travel|immigration/i.test(context)) return false;
      if (/example\s+passport|test\s+passport|sample\s+passport|demo\s+passport|fake\s+passport/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "NATIONAL_INSURANCE_UK",
    regex: /\b(?:NI\b|NINO|national\s+insurance)[:\s\u00A0#-]*([A-CEGHJ-PR-TW-Z]{2}(?:[\s\u00A0.-]?\d{2}){3}[\s\u00A0.-]?[A-D])\b/gi,
    priority: 100,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/.test(cleaned)) return false;
      if (!validateNINO(cleaned)) return false;
      if (!/national\s+insurance|nino|ni\b|uk\b|british|gb|government|tax|benefits|hmrc/i.test(context)) return false;
      if (/example\s+nino|test\s+nino|sample\s+nino|demo\s+nino|fake\s+nino/i.test(context)) return false;
      return true;
    },
    placeholder: "[NINO_{n}]",
    description: "UK National Insurance Number",
    severity: "high"
  },
  {
    type: "NHS_NUMBER",
    regex: /\b(?:NHS|nhs number)[:\s\u00A0#-]*((?:\d{3}[\s\u00A0.-]?){2}\d{4})\b/gi,
    priority: 95,
    validator: (match, context) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{10}$/.test(cleaned)) return false;
      if (!validateNHS(cleaned)) return false;
      if (!/nhs|health|medical|hospital|gp|doctor|patient|clinical/i.test(context)) return false;
      if (/example\s+nhs|test\s+nhs|sample\s+nhs|demo\s+nhs|fake\s+nhs/i.test(context)) return false;
      return true;
    },
    placeholder: "[NHS_{n}]",
    description: "UK NHS Number",
    severity: "high"
  },
  {
    type: "DRIVING_LICENSE_UK",
    regex: /\b(?:DL|DRIVING|DRIVER(?:'S)?|LICEN[SC]E)?[\s\u00A0#:-]*(?:NO|NUM(?:BER)?|ID)?[\s\u00A0#:-]*([A-Z]{5}[\s\u00A0.-]?\d{2}[\s\u00A0.-]?\d{2}[\s\u00A0.-]?\d{2}[\s\u00A0.-]?[A-Z]{2}[\s\u00A0.-]?\d[\s\u00A0.-]?[A-Z]{2})\b/gi,
    priority: 90,
    placeholder: "[DRIVING_LICENSE_{n}]",
    description: "UK Driving License",
    severity: "high",
    validator: (value, context) => {
      const normalized = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (!/^[A-Z]{5}\d{6}[A-Z]{2}\d[A-Z]{2}$/.test(normalized)) return false;
      const dob = normalized.slice(5, 11);
      const month = parseInt(dob.slice(2, 4), 10);
      const day = parseInt(dob.slice(4, 6), 10);
      if (!((month >= 1 && month <= 12 || month >= 51 && month <= 62) && day >= 1 && day <= 31)) return false;
      if (!/driving|license|dl\b|uk\b|british|gb|dvla|vehicle|car/i.test(context)) return false;
      if (/example\s+license|test\s+license|sample\s+license|demo\s+license|fake\s+license/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "DRIVING_LICENSE_US",
    regex: /\b(?:DL|driver(?:'s)?\slicense)[:\s\u00A0#-]*([A-Z0-9](?:[A-Z0-9][\s\u00A0.-]?){3,18}[A-Z0-9])\b/gi,
    priority: 90,
    placeholder: "[DRIVING_LICENSE_{n}]",
    description: "US Driving License",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
      if (cleaned.length < 6 || cleaned.length > 17) return false;
      if (!/[A-Z]/.test(cleaned) || !/\d/.test(cleaned)) return false;
      if (!/driving|license|dl\b|us\b|usa|american|dmv|vehicle|car/i.test(context)) return false;
      if (/example\s+license|test\s+license|sample\s+license|demo\s+license|fake\s+license/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "TAX_ID",
    regex: /\b(?:TIN|tax id|EIN)[:\s\u00A0#-]*(\d{2}(?:[\s\u00A0.-]?\d){7})\b/gi,
    priority: 95,
    placeholder: "[TAX_ID_{n}]",
    description: "Tax identification number",
    severity: "high",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{9}$/.test(cleaned)) return false;
      const firstTwo = parseInt(cleaned.substring(0, 2), 10);
      if (firstTwo === 0 || firstTwo >= 7 && firstTwo <= 8 || firstTwo >= 90 && firstTwo <= 99) return false;
      if (!/tax|tin|ein|irs|government|federal|revenue|income/i.test(context)) return false;
      if (/example\s+tax|test\s+tax|sample\s+tax|demo\s+tax|fake\s+tax|12-3456789/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "PASSPORT_MRZ_TD3",
    regex: /P<[A-Z]{3}[A-Z<]{39}\r?\n[A-Z0-9<]{9}[0-9][A-Z]{3}[0-9]{6}[0-9][MF<][0-9]{6}[0-9][A-Z0-9<]{14}[0-9]/g,
    priority: 98,
    placeholder: "[PASSPORT_MRZ_{n}]",
    description: "Passport Machine Readable Zone (TD3 - 2 lines x 44 chars)",
    severity: "high"
  },
  {
    type: "PASSPORT_MRZ_TD1",
    regex: /[A-Z]{1}[A-Z<][A-Z]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}\r?\n[0-9]{6}[0-9][MF<][0-9]{6}[0-9][A-Z]{3}[A-Z0-9<]{11}[0-9]\r?\n[A-Z<]{30}/g,
    priority: 98,
    placeholder: "[ID_MRZ_{n}]",
    description: "ID Card Machine Readable Zone (TD1 - 3 lines x 30 chars)",
    severity: "high"
  },
  {
    type: "VISA_MRZ",
    regex: /V<[A-Z]{3}[A-Z<]{39}\r?\n[A-Z0-9<]{9}[0-9][A-Z]{3}[0-9]{6}[0-9][MF<][0-9]{6}[0-9][A-Z0-9<]{14}[0-9]/g,
    priority: 98,
    placeholder: "[VISA_MRZ_{n}]",
    description: "Visa Machine Readable Zone",
    severity: "high"
  },
  {
    type: "TRAVEL_DOCUMENT_NUMBER",
    regex: /\b(?:TRAVEL\s+DOC(?:UMENT)?|TD)[:\s#-]*([A-Z0-9](?:[A-Z0-9][\s\u00A0.-]?){4,13}[A-Z0-9])\b/gi,
    priority: 92,
    placeholder: "[TRAVEL_DOC_{n}]",
    description: "Travel document numbers",
    severity: "high",
    validator: (_value, context) => {
      return /travel|document|visa|passport|border|immigration/i.test(context);
    }
  },
  {
    type: "VISA_NUMBER",
    regex: /\b(?:VISA)[:\s#-]*([A-Z0-9](?:[A-Z0-9][\s\u00A0.-]?){6,10}[A-Z0-9])\b/gi,
    priority: 92,
    placeholder: "[VISA_{n}]",
    description: "Visa numbers",
    severity: "high",
    validator: (_value, context) => {
      return /visa|travel|entry|immigration|consulate|embassy/i.test(context);
    }
  },
  {
    type: "IMMIGRATION_NUMBER",
    regex: /\b(?:IMMIGRATION|ALIEN|A-NUMBER|A#)[:\s#-]*([A-Z]?(?:\d[\s\u00A0.-]?){7,9})\b/gi,
    priority: 92,
    placeholder: "[IMMIGRATION_{n}]",
    description: "Immigration and alien registration numbers",
    severity: "high"
  },
  {
    type: "BORDER_CROSSING_CARD",
    regex: /\b(?:BCC|BORDER\s+CROSSING)[:\s#-]*([A-Z0-9](?:[A-Z0-9\s\u00A0.-]?){8,13}[A-Z0-9])\b/gi,
    priority: 90,
    placeholder: "[BCC_{n}]",
    description: "Border crossing card numbers",
    severity: "high",
    validator: (_value, context) => {
      return /border|crossing|card|entry|bcc/i.test(context);
    }
  },
  {
    type: "UTR_UK",
    regex: /\b(?:UTR|unique taxpayer reference)[:\s#-]*((?:\d[\s\u00A0.-]?){10})\b/gi,
    priority: 95,
    validator: (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length === 10 && /^\d{10}$/.test(digits);
    },
    placeholder: "[UTR_{n}]",
    description: "UK Unique Taxpayer Reference",
    severity: "high"
  },
  {
    type: "VAT_NUMBER",
    regex: /\b(?:VAT|vat number)[:\s#-]*([A-Z]{2}(?:[\s\u00A0.-]?[A-Z0-9]){7,12})\b/gi,
    priority: 90,
    validator: (match) => {
      const cleaned = match.replace(/[\s\u00A0.-]/g, "");
      const countryCode = cleaned.substring(0, 2).toUpperCase();
      if (![
        "GB",
        "DE",
        "FR",
        "IT",
        "ES",
        "NL",
        "BE",
        "AT",
        "PL",
        "SE",
        "DK",
        "FI",
        "IE",
        "PT",
        "CZ",
        "HU",
        "RO",
        "BG",
        "GR",
        "HR",
        "SK",
        "SI",
        "LT",
        "LV",
        "EE",
        "CY",
        "LU",
        "MT"
      ].includes(countryCode)) return false;
      const number = cleaned.substring(2);
      if (countryCode === "GB") return /^\d{9}(\d{3})?$/.test(number);
      else if (countryCode === "DE") return /^\d{9}$/.test(number);
      else if (countryCode === "FR") return /^[A-Z0-9]{2}\d{9}$/.test(number);
      return /\d{7,12}/.test(number);
    },
    placeholder: "[VAT_{n}]",
    description: "VAT registration number",
    severity: "medium"
  },
  {
    type: "COMPANY_NUMBER_UK",
    regex: /\b(?:company number|reg(?:\.|istration)?\s+no(?:\.)?)[:\s#]*([A-Z]{2}\d{6}|\d{8})\b/gi,
    priority: 85,
    validator: (match) => {
      const cleaned = match.replace(/\s/g, "");
      return /^(\d{8}|[A-Z]{2}\d{6})$/.test(cleaned);
    },
    placeholder: "[COMPANY_NUMBER_{n}]",
    description: "UK Company registration number",
    severity: "low"
  },
  {
    type: "ITIN",
    regex: /\b(?:ITIN|individual taxpayer)[:\s#]*(9\d{2}[-\s]?[7-8]\d[-\s]?\d{4})\b/gi,
    priority: 100,
    validator: (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length !== 9) return false;
      if (digits[0] !== "9") return false;
      const fourthDigit = parseInt(digits[3]);
      if (fourthDigit !== 7 && fourthDigit !== 8) return false;
      if (/^(\d)\1{8}$/.test(digits)) return false;
      return true;
    },
    placeholder: "[ITIN_{n}]",
    description: "US Individual Taxpayer Identification Number",
    severity: "high"
  },
  {
    type: "SIN_CA",
    regex: /\b(?:SIN|social insurance)[:\s#]*(\d{3}[-\s]?\d{3}[-\s]?\d{3})\b/gi,
    priority: 100,
    validator: (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length !== 9) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        let digit = parseInt(digits[i]);
        if (i % 2 === 1) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
      }
      return sum % 10 === 0;
    },
    placeholder: "[SIN_{n}]",
    description: "Canadian Social Insurance Number",
    severity: "high"
  }
];
var contactPatterns = [
  {
    type: "PHONE_UK_MOBILE",
    regex: /\b(?:\+?44[\s\u00A0.-]?7\d{3}|0?7\d{3})[\s\u00A0.-]?\d{3}[\s\u00A0.-]?\d{3}\b/g,
    priority: 90,
    placeholder: "[PHONE_UK_MOBILE_{n}]",
    description: "UK mobile phone",
    severity: "medium",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0().-]/g, "");
      if (!/^(?:\+?44)?7\d{9}$/.test(cleaned)) return false;
      if (/\b(version|v\d+|release|build)\s*[:\s]*/i.test(context)) return false;
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value)) {
        if (/date|dob|birth|expir/i.test(context)) return false;
      }
      if (/example\s+phone|test\s+number|sample\s+phone|demo\s+phone/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "PHONE_UK",
    regex: /\b(?:\+?44[\s\u00A0.-]?(?:0)?\s*)?(?:\(?0?[1-9]\d{1,3}\)?[\s\u00A0.-]?\d{3,4}[\s\u00A0.-]?\d{3,4})(?:\s?(?:ext\.?|x)\s?\d{1,5})?\b/g,
    priority: 85,
    placeholder: "[PHONE_UK_{n}]",
    description: "UK phone number",
    severity: "medium",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0().-]/g, "").replace(/ext|x/i, "");
      if (!/^(?:\+?44)?0?[1-9]\d{1,3}\d{6,7}$/.test(cleaned)) return false;
      if (/\b(version|v\d+|release|build)\s*[:\s]*/i.test(context)) return false;
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value)) {
        if (/date|dob|birth|expir/i.test(context)) return false;
      }
      if (/example\s+phone|test\s+number|sample\s+phone|demo\s+phone/i.test(context)) return false;
      return true;
    }
  },
  {
    type: "PHONE_US",
    regex: /\b(?:\+1[\s\u00A0.-]?)?(?:\(\d{3}\)|\d{3})[\s\u00A0.-]?\d{3}[\s\u00A0.-]?\d{4}(?:\s?(?:ext\.?|x)\s?\d{1,6})?\b/g,
    priority: 85,
    placeholder: "[PHONE_US_{n}]",
    description: "US phone number",
    severity: "medium",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0().-]/g, "").replace(/ext|x/i, "");
      if (!/^(?:\+?1)?\d{10}$/.test(cleaned)) return false;
      if (/\b(version|v\d+|release|build)\s*[:\s]*/i.test(context)) return false;
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value)) {
        if (/date|dob|birth|expir/i.test(context)) return false;
      }
      if (/example\s+phone|test\s+number|sample\s+phone|demo\s+phone/i.test(context)) return false;
      const areaCode = cleaned.replace(/^\+?1?/, "").substring(0, 3);
      if (areaCode === "000" || areaCode === "111") return false;
      if (areaCode === "555") {
        const contextLower = context.toLowerCase();
        if (/example\s+phone|test\s+number|fictional\s+number|demo\s+phone/i.test(contextLower)) return false;
      }
      return true;
    }
  },
  {
    type: "PHONE_INTERNATIONAL",
    regex: /\b\+(?:\d[\s\u00A0.\-()]?){6,14}\d(?:\s?(?:ext\.?|x)\s?\d{1,6})?\b/g,
    priority: 80,
    placeholder: "[PHONE_{n}]",
    description: "International phone number",
    severity: "medium",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0().-]/g, "").replace(/ext|x/i, "");
      if (!cleaned.startsWith("+")) return false;
      const digitsOnly = cleaned.substring(1);
      if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
      if (!/^\d+$/.test(digitsOnly)) return false;
      if (/\b(version|v\d+|release|build)\s*[:\s]*/i.test(context)) return false;
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value)) {
        if (/date|dob|birth|expir/i.test(context)) return false;
      }
      if (/example\s+phone|test\s+number|sample\s+phone|demo\s+phone/i.test(context)) return false;
      if (/^\+1\d{10}$/.test(cleaned)) return false;
      if (/^\+44\d{10,11}$/.test(cleaned)) return false;
      return true;
    }
  },
  {
    type: "POSTCODE_UK",
    regex: /\b([A-Z]{1,2}\d{1,2}[A-Z]?[\s\u00A0.-]?\d[A-Z]{2})\b/g,
    priority: 75,
    placeholder: "[POSTCODE_{n}]",
    description: "UK postcode",
    severity: "low",
    validator: (value, _context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "");
      if (cleaned.length < 5 || cleaned.length > 7) return false;
      if (!/^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i.test(cleaned)) return false;
      return true;
    }
  },
  {
    type: "ZIP_CODE_US",
    regex: /\b(\d{5}(?:[\s\u00A0.-]\d{4})?)\b/g,
    priority: 70,
    placeholder: "[ZIP_{n}]",
    description: "US ZIP code",
    severity: "low",
    validator: (value, context) => {
      const cleaned = value.replace(/[\s\u00A0.-]/g, "");
      if (!/^\d{5}$/.test(cleaned) && !/^\d{9}$/.test(cleaned)) return false;
      const contextLower = context.toLowerCase();
      if (/\b(phone|tel|call|contact)\b/i.test(contextLower) && cleaned.length === 9) return false;
      return true;
    }
  },
  {
    type: "ADDRESS_STREET",
    regex: /\b\d{1,5}\s+[A-Za-z0-9][A-Za-z0-9'’.\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9'’.\-]*){0,4}\s+(?:Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Boulevard|Blvd\.?|Way|Terrace|Ter\.?|Place|Pl\.?|Trail|Trl\.?|Parkway|Pkwy\.?|Highway|Hwy\.)(?:\s+(?:Apt|Unit|Suite|Ste)\s*\d+)?\b/gi,
    priority: 70,
    placeholder: "[ADDRESS_{n}]",
    description: "Street address",
    severity: "medium"
  },
  {
    type: "ADDRESS_PO_BOX",
    regex: /\b(P\.?O\.?\s?Box\s\d+)\b/gi,
    priority: 75,
    placeholder: "[PO_BOX_{n}]",
    description: "PO Box address",
    severity: "medium"
  }
];
var networkPatterns = [
  {
    type: "IPV4",
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    priority: 80,
    validator: (match) => {
      return ![
        "0.0.0.0",
        "127.0.0.1",
        "255.255.255.255"
      ].includes(match) && !match.startsWith("192.168.") && !match.startsWith("10.");
    },
    placeholder: "[IPV4_{n}]",
    description: "IPv4 address",
    severity: "medium"
  },
  {
    type: "IPV6",
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    priority: 80,
    validator: (match) => {
      return match !== "::1" && !match.startsWith("fe80:");
    },
    placeholder: "[IPV6_{n}]",
    description: "IPv6 address",
    severity: "medium"
  },
  {
    type: "MAC_ADDRESS",
    regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    priority: 75,
    placeholder: "[MAC_{n}]",
    description: "MAC address",
    severity: "low"
  },
  {
    type: "URL_WITH_AUTH",
    regex: /\b(?:https?|ftp):\/\/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@[^\s]+\b/g,
    priority: 95,
    placeholder: "[URL_AUTH_{n}]",
    description: "URL with credentials",
    severity: "high"
  },
  {
    type: "IOT_SERIAL_NUMBER",
    regex: /\bSN:([A-Z0-9]{12})\b/gi,
    priority: 80,
    placeholder: "[IOT_SERIAL_{n}]",
    description: "IoT device serial numbers",
    severity: "medium"
  },
  {
    type: "DEVICE_UUID",
    regex: /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi,
    priority: 75,
    placeholder: "[DEVICE_UUID_{n}]",
    description: "Device UUID identifiers",
    severity: "medium",
    validator: (_match, context) => {
      return /device|uuid|identifier|hardware|iot|sensor/i.test(context);
    }
  }
];
var SOLANA_ADDRESS = {
  type: "SOLANA_ADDRESS",
  regex: /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g,
  placeholder: "[SOL_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Solana (SOL) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (cleaned.length < 32 || cleaned.length > 44) return false;
    if (!/solana|sol\b|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/^(bc1|1|3|0x|L|M|D|X|r|cosmos|tz|addr)/.test(cleaned)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(cleaned)) return false;
    return true;
  }
};
var POLKADOT_ADDRESS = {
  type: "POLKADOT_ADDRESS",
  regex: /\b(1[1-9A-HJ-NP-Za-km-z]{46,47})\b/g,
  placeholder: "[DOT_ADDR_{n}]",
  priority: 85,
  severity: "high",
  description: "Polkadot (DOT) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (cleaned.length < 47 || cleaned.length > 48) return false;
    if (!cleaned.startsWith("1")) return false;
    if (!/polkadot|dot\b|crypto|wallet|blockchain|substrate|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^1[1-9A-HJ-NP-Za-km-z]+$/.test(cleaned)) return false;
    return true;
  }
};
var AVALANCHE_ADDRESS = {
  type: "AVALANCHE_ADDRESS",
  regex: /\b([XPC][-\s\u00A0]?(?:avax)?[a-z0-9]{38,43})\b/gi,
  placeholder: "[AVAX_ADDR_{n}]",
  priority: 85,
  severity: "high",
  description: "Avalanche (AVAX) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0]/g, "").toUpperCase();
    if (!/^[XPC][-]?/.test(cleaned)) return false;
    if (cleaned.length < 40 || cleaned.length > 46) return false;
    if (!/avalanche|avax\b|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    return true;
  }
};
var COSMOS_ADDRESS = {
  type: "COSMOS_ADDRESS",
  regex: /\b(cosmos1[a-z0-9]{38,44})\b/g,
  placeholder: "[ATOM_ADDR_{n}]",
  priority: 80,
  severity: "high",
  description: "Cosmos (ATOM) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "").toLowerCase();
    if (!cleaned.startsWith("cosmos1")) return false;
    if (cleaned.length < 39 || cleaned.length > 45) return false;
    if (!/cosmos|atom\b|crypto|wallet|blockchain|ibc|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^cosmos1[a-z0-9]+$/.test(cleaned)) return false;
    return true;
  }
};
var ALGORAND_ADDRESS = {
  type: "ALGORAND_ADDRESS",
  regex: /\b([A-Z2-7]{58})\b/g,
  placeholder: "[ALGO_ADDR_{n}]",
  priority: 80,
  severity: "high",
  description: "Algorand (ALGO) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
    if (cleaned.length !== 58) return false;
    if (!/^[A-Z2-7]+$/.test(cleaned)) return false;
    if (!/algorand|algo\b|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    return true;
  }
};
var TEZOS_ADDRESS = {
  type: "TEZOS_ADDRESS",
  regex: /\b(tz[123][1-9A-HJ-NP-Za-km-z]{33})\b/g,
  placeholder: "[XTZ_ADDR_{n}]",
  priority: 80,
  severity: "high",
  description: "Tezos (XTZ) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!/^tz[123]/.test(cleaned)) return false;
    if (cleaned.length !== 36) return false;
    if (!/tezos|xtz\b|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^tz[123][1-9A-HJ-NP-Za-km-z]+$/.test(cleaned)) return false;
    return true;
  }
};
var POLYGON_ADDRESS = {
  type: "POLYGON_ADDRESS",
  regex: /\b(0x[a-fA-F0-9]{40})\b/g,
  placeholder: "[MATIC_ADDR_{n}]",
  priority: 85,
  severity: "high",
  description: "Polygon (MATIC) cryptocurrency address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!cleaned.startsWith("0x") || cleaned.length !== 42) return false;
    if (!/polygon|matic\b|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/ethereum|eth\b|ether/i.test(context) && !/polygon|matic/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) return false;
    return true;
  }
};
var BINANCE_CHAIN_ADDRESS = {
  type: "BINANCE_CHAIN_ADDRESS",
  regex: /\b(0x[a-fA-F0-9]{40})\b/g,
  placeholder: "[BNB_ADDR_{n}]",
  priority: 85,
  severity: "high",
  description: "Binance Smart Chain (BNB) address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!cleaned.startsWith("0x") || cleaned.length !== 42) return false;
    if (!/binance|bnb\b|bsc|smart[- ]?chain|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/ethereum|eth\b|ether/i.test(context) && !/binance|bnb|bsc/i.test(context)) return false;
    if (/polygon|matic/i.test(context) && !/binance|bnb|bsc/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) return false;
    return true;
  }
};
var NEAR_ADDRESS = {
  type: "NEAR_ADDRESS",
  regex: /\b([a-z0-9_-]{2,64}\.near)\b/gi,
  placeholder: "[NEAR_ADDR_{n}]",
  priority: 80,
  severity: "high",
  description: "Near Protocol (NEAR) address",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0]/g, "").toLowerCase();
    if (!cleaned.endsWith(".near")) return false;
    const accountName = cleaned.slice(0, -5);
    if (accountName.length < 2 || accountName.length > 64) return false;
    if (!/^[a-z0-9_-]+$/.test(accountName)) return false;
    if (!/near|protocol|crypto|wallet|blockchain|address|send|receive|transaction|transfer/i.test(context)) return false;
    if (/example|test|sample|demo|fake|dummy|placeholder|version|release/i.test(context)) return false;
    return true;
  }
};
var cryptoExtendedPatterns = [
  SOLANA_ADDRESS,
  POLKADOT_ADDRESS,
  AVALANCHE_ADDRESS,
  COSMOS_ADDRESS,
  ALGORAND_ADDRESS,
  TEZOS_ADDRESS,
  POLYGON_ADDRESS,
  BINANCE_CHAIN_ADDRESS,
  NEAR_ADDRESS
];
var MEDICAL_RECORD_NUMBER = {
  type: "MEDICAL_RECORD_NUMBER",
  regex: /\b(?:MR[N]?[-\s]?|MEDICAL[-\s]?REC(?:ORD)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*)([A-Z0-9]{6,12})\b/gi,
  placeholder: "[MRN_{n}]",
  priority: 85,
  severity: "high",
  description: "Medical Record Numbers in various hospital formats"
};
var PATIENT_ID = {
  type: "PATIENT_ID",
  regex: /\b(?:PATIENT[-\s]?(?:ID|NUM(?:BER)?|REF(?:ERENCE)?)[-\s]?[:#]?\s*)([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PATIENT_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Patient identification numbers"
};
var APPOINTMENT_REF = {
  type: "APPOINTMENT_REF",
  regex: /\b(?:APT|APPT|APPOINTMENT)[-\s]?(?:REF|ID|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,10})\b/gi,
  placeholder: "[APT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Medical appointment reference numbers"
};
var ICD10_CODE = {
  type: "ICD10_CODE",
  regex: /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g,
  placeholder: "[ICD10_{n}]",
  priority: 70,
  severity: "medium",
  description: "ICD-10 diagnosis codes",
  validator: (value, context) => {
    const medicalContext = /diagnos|condition|disease|disorder|icd|code/i.test(context);
    const validFormat = /^[A-TV-Z]/.test(value);
    return medicalContext && validFormat;
  }
};
var CPT_CODE = {
  type: "CPT_CODE",
  regex: /\b(?:CPT[-\s]?(?:CODE)?[-\s]?[:#]?\s*)?([0-9]{5})\b/g,
  placeholder: "[CPT_{n}]",
  priority: 70,
  severity: "medium",
  description: "CPT medical procedure codes",
  validator: (value, context) => {
    const code = parseInt(value);
    const validRange = code >= 100 && code <= 99499;
    const medicalContext = /procedure|cpt|billing|treatment|service/i.test(context);
    return validRange && medicalContext;
  }
};
var PRESCRIPTION_NUMBER = {
  type: "PRESCRIPTION_NUMBER",
  regex: /\b(?:RX|PRESC(?:RIPTION)?|SCRIPT)[-\s]?(?:NO|NUM(?:BER)?|REF|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RX_{n}]",
  priority: 80,
  severity: "high",
  description: "Prescription reference numbers"
};
var HEALTH_INSURANCE_CLAIM = {
  type: "HEALTH_INSURANCE_CLAIM",
  regex: /\b(?:CLAIM|CLM)[-\s]?(?:NO|NUM(?:BER)?|REF|ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[CLAIM_{n}]",
  priority: 80,
  severity: "high",
  description: "Health insurance claim numbers",
  validator: (_value, context) => {
    return /insurance|claim|medical|health|policy/i.test(context);
  }
};
var HEALTH_PLAN_NUMBER = {
  type: "HEALTH_PLAN_NUMBER",
  regex: /\b(?:HEALTH[-\s]?PLAN|BENEFICIARY|MEMBER)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,15})\b/gi,
  placeholder: "[HEALTH_PLAN_{n}]",
  priority: 85,
  severity: "high",
  description: "Health plan beneficiary/member numbers"
};
var MEDICAL_DEVICE_SERIAL = {
  type: "MEDICAL_DEVICE_SERIAL",
  regex: /\b(?:DEVICE|IMPLANT|PACEMAKER|DEFIBRILLATOR)[-\s]?(?:SERIAL|SN|S\/N)[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[DEVICE_{n}]",
  priority: 75,
  severity: "high",
  description: "Medical device serial numbers"
};
var LAB_TEST_ID = {
  type: "LAB_TEST_ID",
  regex: /\b(?:LAB|TEST|SAMPLE)[-\s]?(?:ID|NUM(?:BER)?|REF)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[LAB_{n}]",
  priority: 75,
  severity: "medium",
  description: "Laboratory test and sample IDs",
  validator: (_value, context) => {
    return /lab|test|sample|specimen|pathology/i.test(context);
  }
};
var TRIAL_PARTICIPANT_ID = {
  type: "TRIAL_PARTICIPANT_ID",
  regex: /\b(?:PARTICIPANT|SUBJECT|TRIAL)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{1,2}[-]?\d{4,6})\b/gi,
  placeholder: "[TRIAL_PART_{n}]",
  priority: 85,
  severity: "high",
  description: "Clinical trial participant identifiers"
};
var PROTOCOL_NUMBER = {
  type: "PROTOCOL_NUMBER",
  regex: /\b(?:PROTOCOL|STUDY)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[PROTOCOL_{n}]",
  priority: 75,
  severity: "medium",
  description: "Clinical trial protocol numbers",
  validator: (_value, context) => {
    return /trial|study|protocol|research|clinical/i.test(context);
  }
};
var GENETIC_MARKER = {
  type: "GENETIC_MARKER",
  regex: /\b(rs\d{6,10})\b/gi,
  placeholder: "[SNP_{n}]",
  priority: 80,
  severity: "high",
  description: "Genetic markers (dbSNP rs numbers)",
  validator: (_value, context) => {
    return /genetic|gene|snp|marker|genome|dna|variant|allele/i.test(context);
  }
};
var BIOBANK_SAMPLE_ID = {
  type: "BIOBANK_SAMPLE_ID",
  regex: /\b(?:BIOBANK|SAMPLE|SPECIMEN)[-\s]?(?:ID|NO)?[-\s]?[:#]?\s*([A-Z0-9]{8,15})\b/gi,
  placeholder: "[BIOBANK_{n}]",
  priority: 85,
  severity: "high",
  description: "Biobank sample identifiers",
  validator: (_value, context) => {
    return /biobank|specimen|sample|tissue|blood|genetic/i.test(context);
  }
};
var PROVIDER_LICENSE = {
  type: "PROVIDER_LICENSE",
  regex: /\b(?:MEDICAL|PHYSICIAN|DOCTOR|NURSE|PROVIDER)[-\s\u00A0]*(?:LICENSE|LICENCE|LIC)[-\s\u00A0]*(?:NO|NUM(?:BER)?)?[-\s\u00A0.:#]*((?:[A-Z0-9]{2,6}[\s\u00A0./-]?){1,3}[A-Z0-9]{2,6})\b/gi,
  placeholder: "[PROVIDER_LIC_{n}]",
  priority: 80,
  severity: "high",
  description: "Healthcare provider license numbers",
  validator: (value) => {
    const normalized = value.replace(/[^A-Za-z0-9]/g, "");
    if (normalized.length < 6 || normalized.length > 18) return false;
    return /[A-Z]/i.test(normalized) && /\d/.test(normalized);
  }
};
var NPI_NUMBER = {
  type: "NPI_NUMBER",
  regex: /\b(?:NPI[-\s\u00A0]*(?:NO|NUM(?:BER)?)?[-\s\u00A0.:#]*)?((?:\d[\s\u00A0.-]?){10})\b/g,
  placeholder: "[NPI_{n}]",
  priority: 85,
  severity: "high",
  description: "US National Provider Identifier",
  validator: (value, context) => {
    if (!/provider|npi|physician|doctor|clinic|hospital|practice/i.test(context)) return false;
    const digits = value.replace(/\D/g, "").split("").map(Number);
    if (digits.length !== 10) return false;
    let sum = 0;
    for (let i = digits.length - 2; i >= 0; i--) {
      let digit = digits[i];
      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return (10 - sum % 10) % 10 === digits[digits.length - 1];
  }
};
var DEA_NUMBER = {
  type: "DEA_NUMBER",
  regex: /\b(?:DEA[-\s\u00A0]*(?:NO|NUM(?:BER)?)?[-\s\u00A0.:#]*)?([A-Z]{2}(?:[\s\u00A0.-]?\d){7})\b/gi,
  placeholder: "[DEA_{n}]",
  priority: 90,
  severity: "high",
  description: "DEA registration number for controlled substances",
  validator: (value, _context) => {
    const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (normalized.length !== 9) return false;
    if (![
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "P",
      "R",
      "S",
      "T",
      "U"
    ].includes(normalized[0])) return false;
    const digits = normalized.substring(2).split("").map(Number);
    return (digits[0] + digits[2] + digits[4] + (digits[1] + digits[3] + digits[5]) * 2) % 10 === digits[6];
  }
};
var HOSPITAL_ACCOUNT = {
  type: "HOSPITAL_ACCOUNT",
  regex: /\b(?:HOSPITAL|H|HAR)[-\s]?(?:ACCOUNT|ACCT|A\/C)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[H_ACCT_{n}]",
  priority: 80,
  severity: "high",
  description: "Hospital account numbers"
};
var EMERGENCY_CONTACT_MARKER = {
  type: "EMERGENCY_CONTACT",
  regex: /(?:emergency\s+contact|next\s+of\s+kin|ice|in\s+case\s+of\s+emergency)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
  placeholder: "[EMERGENCY_CONTACT_{n}]",
  priority: 85,
  severity: "high",
  description: "Emergency contact person names"
};
var BIOMETRIC_ID = {
  type: "BIOMETRIC_ID",
  regex: /\b(?:FINGERPRINT|RETINAL?[-\s\u00A0]?SCAN|IRIS[-\s\u00A0]?SCAN|VOICE[-\s\u00A0]?PRINT|FACIAL[-\s\u00A0]?RECOGNITION|BIOMETRIC)[-\s\u00A0]?(?:ID|DATA|TEMPLATE|HASH)?[-\s\u00A0.:#]*([A-Z0-9][A-Z0-9._-]{7,39})\b/gi,
  placeholder: "[BIOMETRIC_{n}]",
  priority: 95,
  severity: "high",
  description: "Biometric identifier references",
  validator: (value) => {
    const normalized = value.replace(/[^A-Za-z0-9]/g, "");
    if (normalized.length < 8 || normalized.length > 40) return false;
    return /[A-Z]/i.test(normalized) && /\d/.test(normalized);
  }
};
var DNA_SEQUENCE = {
  type: "DNA_SEQUENCE",
  regex: /\b([ATCG]{20,})\b/g,
  placeholder: "[DNA_{n}]",
  priority: 90,
  severity: "high",
  description: "DNA sequence patterns",
  validator: (value, context) => {
    const geneticContext = /dna|genetic|sequence|genome|nucleotide|gene/i.test(context);
    const longEnough = value.length >= 20;
    const validChars = /^[ATCGRYSWKMBDHVN]+$/i.test(value);
    return geneticContext && longEnough && validChars;
  }
};
var DRUG_DOSAGE = {
  type: "DRUG_DOSAGE",
  regex: /\b([A-Z][a-z]+(?:ine|ol|azole|mycin|cillin|pril|olol|mab|pam|tab|pine|done|ide|tide|ase|statin))\s+(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|units?|IU)\b/gi,
  placeholder: "[DRUG_DOSAGE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Drug names with dosages",
  validator: (_value, context) => {
    return /medication|prescription|drug|dose|treatment|therapy/i.test(context);
  }
};
var MEDICAL_IMAGE_REF = {
  type: "MEDICAL_IMAGE_REF",
  regex: /\b(?:X[-\s\u00A0]?RAY|MRI|CT[-\s\u00A0]?SCAN|PET[-\s\u00A0]?SCAN|ULTRASOUND|MAMMOGRAM)[-\s\u00A0]?(?:IMAGE|FILE|ID)?[-\s\u00A0.:#]*([A-Z0-9][A-Z0-9_.-]{5,23})\b/gi,
  placeholder: "[IMAGE_{n}]",
  priority: 80,
  severity: "high",
  description: "Medical imaging file references"
};
var BLOOD_TYPE_PATIENT = {
  type: "BLOOD_TYPE",
  regex: /\b(?:blood\s+type|blood\s+group)[:\s]+(A|B|AB|O)[+-]?\b/gi,
  placeholder: "[BLOOD_TYPE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Patient blood type information"
};
var ALLERGY_INFO = {
  type: "ALLERGY_INFO",
  regex: /\b(?:allergic\s+to|allergy)[:\s]+([A-Za-z\s,]+(?:penicillin|peanuts|latex|aspirin|shellfish|eggs|dairy|soy|wheat))/gi,
  placeholder: "[ALLERGY_{n}]",
  priority: 85,
  severity: "high",
  description: "Patient allergy information"
};
var VACCINATION_ID = {
  type: "VACCINATION_ID",
  regex: /\b(?:VACCINE|VACCINATION|IMMUNIZATION)[-\s]?(?:ID|RECORD|NO)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[VAX_{n}]",
  priority: 80,
  severity: "high",
  description: "Vaccination record identifiers",
  validator: (_value, context) => {
    return /vaccine|vaccination|immunization|shot|dose/i.test(context);
  }
};
var CHI_NUMBER = {
  type: "CHI_NUMBER",
  regex: /\b(?:CHI|community health index)[-\s]?(?:number|no)?[-\s]?[:#]?\s*(\d{6}[-\s]?\d{4})\b/gi,
  placeholder: "[CHI_{n}]",
  priority: 95,
  severity: "high",
  description: "Scottish Community Health Index number",
  validator: (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length !== 10) return false;
    const day = parseInt(digits.substring(0, 2));
    const month = parseInt(digits.substring(2, 4));
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    let sum = 0;
    const weights = [
      10,
      9,
      8,
      7,
      6,
      5,
      4,
      3,
      2
    ];
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * weights[i];
    const checkDigit = 11 - sum % 11;
    return (checkDigit === 11 ? 0 : checkDigit === 10 ? 0 : checkDigit) === parseInt(digits[9]);
  }
};
var EHIC_NUMBER = {
  type: "EHIC_NUMBER",
  regex: /\b(?:EHIC|european health insurance|health card)[-\s]?(?:number|no)?[-\s]?[:#]?\s*([A-Z]{2}\s?\d{12,16})\b/gi,
  placeholder: "[EHIC_{n}]",
  priority: 90,
  severity: "high",
  description: "European Health Insurance Card number",
  validator: (match) => {
    const cleaned = match.replace(/\s/g, "");
    const countryCode = cleaned.substring(0, 2).toUpperCase();
    if (![
      "AT",
      "BE",
      "BG",
      "HR",
      "CY",
      "CZ",
      "DK",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "HU",
      "IS",
      "IE",
      "IT",
      "LV",
      "LI",
      "LT",
      "LU",
      "MT",
      "NL",
      "NO",
      "PL",
      "PT",
      "RO",
      "SK",
      "SI",
      "ES",
      "SE",
      "CH",
      "GB"
    ].includes(countryCode)) return false;
    const number = cleaned.substring(2);
    return /^\d{12,16}$/.test(number);
  }
};
var healthcarePatterns = [
  MEDICAL_RECORD_NUMBER,
  PATIENT_ID,
  APPOINTMENT_REF,
  ICD10_CODE,
  CPT_CODE,
  PRESCRIPTION_NUMBER,
  HEALTH_INSURANCE_CLAIM,
  HEALTH_PLAN_NUMBER,
  MEDICAL_DEVICE_SERIAL,
  LAB_TEST_ID,
  TRIAL_PARTICIPANT_ID,
  PROTOCOL_NUMBER,
  GENETIC_MARKER,
  BIOBANK_SAMPLE_ID,
  PROVIDER_LICENSE,
  NPI_NUMBER,
  DEA_NUMBER,
  HOSPITAL_ACCOUNT,
  EMERGENCY_CONTACT_MARKER,
  BIOMETRIC_ID,
  DNA_SEQUENCE,
  DRUG_DOSAGE,
  MEDICAL_IMAGE_REF,
  BLOOD_TYPE_PATIENT,
  ALLERGY_INFO,
  VACCINATION_ID,
  CHI_NUMBER,
  EHIC_NUMBER
];
var SWIFT_BIC = {
  type: "SWIFT_BIC",
  regex: /\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g,
  placeholder: "[SWIFT_{n}]",
  priority: 85,
  severity: "high",
  description: "SWIFT/BIC codes for international transfers",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
    const financialContext = /swift|bic|bank|transfer|wire|international|payment/i.test(context);
    const validLength = cleaned.length === 8 || cleaned.length === 11;
    const validFormat = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
    return financialContext && validLength && validFormat;
  }
};
var TRANSACTION_ID = {
  type: "TRANSACTION_ID",
  regex: /\b(?:TXN|TX|TRANS(?:ACTION)?)[-\s]?(?:ID|NO|NUM(?:BER)?|REF)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[TXN_{n}]",
  priority: 80,
  severity: "medium",
  description: "Financial transaction identifiers"
};
var INVESTMENT_ACCOUNT = {
  type: "INVESTMENT_ACCOUNT",
  regex: /\b(?:ISA|SIPP|INV(?:ESTMENT)?|PENSION|401K|IRA)[-\s\u00A0]*(?:ACCOUNT|ACCT|A\/C)?[-\s\u00A0]*(?:NO|NUM(?:BER)?)?[-\s\u00A0.:#]*([A-Z0-9](?:[A-Z0-9][\s\u00A0./-]?){5,18}[A-Z0-9])\b/gi,
  placeholder: "[INV_ACCT_{n}]",
  priority: 85,
  severity: "high",
  description: "Investment and pension account numbers",
  validator: (value, context) => {
    const normalized = value.replace(/[\s\u00A0./-]/g, "");
    const hasDigits = /\d{4,}/.test(normalized);
    const validLength = normalized.length >= 6 && normalized.length <= 15;
    const inContext = /isa|sipp|invest|pension|401k|ira|account|fund/i.test(context);
    return hasDigits && validLength && inContext;
  }
};
var WIRE_TRANSFER_REF = {
  type: "WIRE_TRANSFER_REF",
  regex: /\b(?:WIRE|TRANSFER|REMITTANCE)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[WIRE_{n}]",
  priority: 85,
  severity: "high",
  description: "Wire transfer reference numbers"
};
var DD_MANDATE = {
  type: "DD_MANDATE",
  regex: /\b(?:DD|DIRECT[-\s]?DEBIT)[-\s]?(?:MANDATE|REF(?:ERENCE)?|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,18})\b/gi,
  placeholder: "[DD_MANDATE_{n}]",
  priority: 80,
  severity: "high",
  description: "Direct Debit mandate reference numbers"
};
var CHEQUE_NUMBER = {
  type: "CHEQUE_NUMBER",
  regex: /\b(?:CHE(?:QUE|CK))[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{6,10})\b/gi,
  placeholder: "[CHEQUE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Cheque/check numbers",
  validator: (_value, context) => {
    return /cheque|check|payment/i.test(context);
  }
};
var TRADING_ACCOUNT = {
  type: "TRADING_ACCOUNT",
  regex: /\b(?:TRADING|BROKERAGE|STOCK)[-\s]?(?:ACCOUNT|ACCT|A\/C)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[TRADE_ACCT_{n}]",
  priority: 85,
  severity: "high",
  description: "Stock trading and brokerage account numbers"
};
var LOAN_ACCOUNT = {
  type: "LOAN_ACCOUNT",
  regex: /\b(?:LOAN|MORTGAGE|CREDIT)[-\s]?(?:ACCOUNT|ACCT|A\/C)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[LOAN_{n}]",
  priority: 85,
  severity: "high",
  description: "Loan and mortgage account numbers"
};
var BITCOIN_ADDRESS = {
  type: "BITCOIN_ADDRESS",
  regex: /\b([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g,
  placeholder: "[BTC_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Bitcoin cryptocurrency addresses",
  validator: (value, _context) => {
    if (value.startsWith("bc1")) return value.length >= 42 && value.length <= 62;
    else {
      const hasLowercase = /[a-km-z]/.test(value);
      const hasUppercase = /[A-HJ-NP-Z]/.test(value);
      return hasLowercase || hasUppercase;
    }
  }
};
var ETHEREUM_ADDRESS = {
  type: "ETHEREUM_ADDRESS",
  regex: /\b(0x[a-fA-F0-9]{40})\b/g,
  placeholder: "[ETH_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Ethereum cryptocurrency addresses"
};
var LITECOIN_ADDRESS = {
  type: "LITECOIN_ADDRESS",
  regex: /\b([LM][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-z0-9]{39,59})\b/g,
  placeholder: "[LTC_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Litecoin cryptocurrency addresses",
  validator: (value, context) => {
    return /crypto|litecoin|ltc|wallet|address/i.test(context) || value.startsWith("ltc1");
  }
};
var MONERO_ADDRESS = {
  type: "MONERO_ADDRESS",
  regex: /\b([48][a-km-zA-HJ-NP-Z1-9]{94})\b/g,
  placeholder: "[XMR_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Monero cryptocurrency addresses",
  validator: (value, context) => {
    return /crypto|monero|xmr|wallet|address/i.test(context) && value.length === 95;
  }
};
var RIPPLE_ADDRESS = {
  type: "RIPPLE_ADDRESS",
  regex: /\b(r[a-km-zA-HJ-NP-Z1-9]{24,34})\b/g,
  placeholder: "[XRP_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Ripple (XRP) cryptocurrency addresses",
  validator: (value, context) => {
    return /crypto|ripple|xrp|wallet|address/i.test(context) && value.length >= 25 && value.length <= 35;
  }
};
var CARDANO_ADDRESS = {
  type: "CARDANO_ADDRESS",
  regex: /\b(addr1[a-z0-9]{58,104})\b/g,
  placeholder: "[ADA_ADDR_{n}]",
  priority: 90,
  severity: "high",
  description: "Cardano (ADA) cryptocurrency addresses"
};
var CRYPTO_TX_HASH = {
  type: "CRYPTO_TX_HASH",
  regex: /\b(?:TX|TXID|TRANSACTION[-\s]?HASH)[:\s]+([a-fA-F0-9]{64})\b/gi,
  placeholder: "[CRYPTO_TX_{n}]",
  priority: 85,
  severity: "high",
  description: "Cryptocurrency transaction hashes",
  validator: (_value, context) => {
    return /crypto|bitcoin|ethereum|blockchain|transaction|tx|txid/i.test(context);
  }
};
var CARD_TRACK1_DATA = {
  type: "CARD_TRACK1_DATA",
  regex: /%B\d{13,19}\^[^^]+\^\d{4}\d{3}[^?]+\?/g,
  placeholder: "[TRACK1_{n}]",
  priority: 95,
  severity: "high",
  description: "Payment card Track 1 magnetic stripe data"
};
var CARD_TRACK2_DATA = {
  type: "CARD_TRACK2_DATA",
  regex: /;\d{13,19}=\d{4}\d{3}[^?]+\?/g,
  placeholder: "[TRACK2_{n}]",
  priority: 95,
  severity: "high",
  description: "Payment card Track 2 magnetic stripe data"
};
var CVV_IN_CONTEXT = {
  type: "CVV_CODE",
  regex: /\b(?:CVV|CVC|CVV2|CID|CSC)[:\s]+(\d{3,4})\b/gi,
  placeholder: "[CVV_{n}]",
  priority: 95,
  severity: "high",
  description: "Card verification value (CVV/CVC) codes",
  validator: (value, _context) => {
    return value.length >= 3 && value.length <= 4;
  }
};
var CARD_EXPIRY_IN_CONTEXT = {
  type: "CARD_EXPIRY",
  regex: /\b(?:EXP(?:IRY|IRATION)?|VALID\s+THRU)[:\s]+(\d{2}[\/\-]\d{2,4}|\d{4})\b/gi,
  placeholder: "[EXPIRY_{n}]",
  priority: 90,
  severity: "high",
  description: "Card expiration dates",
  validator: (value, context) => {
    const cardContext = /card|payment|credit|debit|visa|mastercard|amex/i.test(context);
    if (value.includes("/") || value.includes("-")) {
      const parts = value.split(/[\/\-]/);
      const month = parseInt(parts[0]);
      return cardContext && month >= 1 && month <= 12;
    }
    return cardContext;
  }
};
var STOCK_TRADE = {
  type: "STOCK_TRADE",
  regex: /\b([A-Z]{1,5})\s+(?:BUY|SELL|SOLD|BOUGHT)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:@|at)\s+\$?(\d+(?:\.\d{2,4})?)\b/gi,
  placeholder: "[TRADE_{n}]",
  priority: 85,
  severity: "high",
  description: "Stock trade details with ticker, quantity, and price",
  validator: (_value, context) => {
    return /stock|trade|buy|sell|shares|equity|portfolio/i.test(context);
  }
};
var WIRE_TRANSFER_DETAILS = {
  type: "WIRE_TRANSFER_DETAILS",
  regex: /\b(?:WIRE\s+TO|TRANSFER\s+TO|BENEFICIARY)[:\s]+([A-Z0-9\s,.-]{20,100})/gi,
  placeholder: "[WIRE_DETAILS_{n}]",
  priority: 90,
  severity: "high",
  description: "Bank wire transfer beneficiary details",
  validator: (_value, context) => {
    return /wire|transfer|beneficiary|recipient|iban|swift|aba|routing/i.test(context);
  }
};
var PAYMENT_TOKEN = {
  type: "PAYMENT_TOKEN",
  regex: /\b(?:tok|card|pm|src)_[a-zA-Z0-9]{24,}/g,
  placeholder: "[PAY_TOKEN_{n}]",
  priority: 90,
  severity: "high",
  description: "Payment gateway tokens (Stripe, etc.)"
};
var PAYMENT_CUSTOMER_ID = {
  type: "PAYMENT_CUSTOMER_ID",
  regex: /\b(cus_[a-zA-Z0-9]{14,})/g,
  placeholder: "[CUST_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Payment gateway customer IDs"
};
var SUBSCRIPTION_ID = {
  type: "SUBSCRIPTION_ID",
  regex: /\b(sub_[a-zA-Z0-9]{14,})/g,
  placeholder: "[SUB_ID_{n}]",
  priority: 80,
  severity: "medium",
  description: "Payment subscription IDs"
};
var STATEMENT_REF = {
  type: "STATEMENT_REF",
  regex: /\b(?:STATEMENT|STMT)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[STMT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Account statement reference numbers"
};
var STANDING_ORDER_REF = {
  type: "STANDING_ORDER_REF",
  regex: /\b(?:STANDING[-\s]?ORDER|SO)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[SO_{n}]",
  priority: 75,
  severity: "medium",
  description: "Standing order reference numbers"
};
var PAYMENT_REFERENCE = {
  type: "PAYMENT_REFERENCE",
  regex: /\b(?:PAYMENT|PAY)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[PAY_REF_{n}]",
  priority: 75,
  severity: "medium",
  description: "Generic payment reference numbers"
};
var CARD_AUTH_CODE = {
  type: "CARD_AUTH_CODE",
  regex: /\b(?:AUTH(?:ORIZATION)?|APPROVAL)[-\s]?(?:CODE|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[AUTH_{n}]",
  priority: 80,
  severity: "high",
  description: "Card authorization codes",
  validator: (_value, context) => {
    return /payment|card|transaction|auth|approval/i.test(context);
  }
};
var MERCHANT_ID = {
  type: "MERCHANT_ID",
  regex: /\b(?:MERCHANT|MID)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[MERCHANT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Merchant identification numbers",
  validator: (_value, context) => {
    return /merchant|terminal|pos|payment|processor/i.test(context);
  }
};
var TERMINAL_ID = {
  type: "TERMINAL_ID",
  regex: /\b(?:TERMINAL|TID|POS)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[TERMINAL_{n}]",
  priority: 75,
  severity: "medium",
  description: "Point of sale terminal IDs",
  validator: (_value, context) => {
    return /terminal|pos|point.of.sale|card.reader/i.test(context);
  }
};
var UK_BANK_ACCOUNT_IBAN = {
  type: "UK_BANK_ACCOUNT_IBAN",
  regex: /\b(GB\d{2}[\s\u00A0.-]?[A-Z]{4}[\s\u00A0.-]?\d{14})\b/gi,
  placeholder: "[UK_IBAN_{n}]",
  priority: 95,
  severity: "high",
  description: "UK bank account numbers in IBAN format",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
    if (!cleaned.startsWith("GB") || cleaned.length !== 22) return false;
    if (!validateIBAN(cleaned)) return false;
    if (!/iban|account|bank|uk|gb|financial|payment|transfer/i.test(context)) return false;
    if (/example\s+iban|test\s+iban|sample\s+iban|demo\s+iban|fake\s+iban/i.test(context)) return false;
    return true;
  }
};
var UK_SORT_CODE_ACCOUNT = {
  type: "UK_SORT_CODE_ACCOUNT",
  regex: /\b(\d{2}[\s\u00A0-]?\d{2}[\s\u00A0-]?\d{2}[\s\u00A0]?\d{8})\b/g,
  placeholder: "[UK_ACCOUNT_{n}]",
  priority: 95,
  severity: "high",
  description: "UK sort code and account number combination",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!/^\d{14}$/.test(cleaned)) return false;
    const sortCode = cleaned.substring(0, 6);
    if (cleaned.substring(6).length !== 8) return false;
    if (!validateSortCode(sortCode)) return false;
    if (!/sort\s+code|account|bank|uk|gb|financial|payment|transfer/i.test(context)) return false;
    if (/example\s+account|test\s+account|sample\s+account|demo\s+account|fake\s+account/i.test(context)) return false;
    return true;
  }
};
var financialPatterns$1 = [
  SWIFT_BIC,
  TRANSACTION_ID,
  INVESTMENT_ACCOUNT,
  WIRE_TRANSFER_REF,
  WIRE_TRANSFER_DETAILS,
  DD_MANDATE,
  CHEQUE_NUMBER,
  TRADING_ACCOUNT,
  LOAN_ACCOUNT,
  BITCOIN_ADDRESS,
  ETHEREUM_ADDRESS,
  LITECOIN_ADDRESS,
  MONERO_ADDRESS,
  RIPPLE_ADDRESS,
  CARDANO_ADDRESS,
  CRYPTO_TX_HASH,
  CARD_TRACK1_DATA,
  CARD_TRACK2_DATA,
  CVV_IN_CONTEXT,
  CARD_EXPIRY_IN_CONTEXT,
  STOCK_TRADE,
  PAYMENT_TOKEN,
  PAYMENT_CUSTOMER_ID,
  SUBSCRIPTION_ID,
  STATEMENT_REF,
  STANDING_ORDER_REF,
  PAYMENT_REFERENCE,
  CARD_AUTH_CODE,
  MERCHANT_ID,
  TERMINAL_ID,
  UK_BANK_ACCOUNT_IBAN,
  UK_SORT_CODE_ACCOUNT
];
var AWS_ACCESS_KEY = {
  type: "AWS_ACCESS_KEY",
  regex: /\b(AKIA[0-9A-Z]{16})\b/g,
  placeholder: "[AWS_KEY_{n}]",
  priority: 95,
  severity: "high",
  description: "AWS Access Key ID"
};
var OPENAI_API_KEY = {
  type: "OPENAI_API_KEY",
  regex: /\b(sk-proj-[A-Za-z0-9_-]{100,200}|sk-[A-Za-z0-9_-]{48,52})\b/g,
  placeholder: "[OPENAI_API_KEY_{n}]",
  priority: 99,
  severity: "high",
  description: "OpenAI API Key"
};
var AWS_SECRET_KEY = {
  type: "AWS_SECRET_KEY",
  regex: /(?:aws.{0,20})?(?:secret.{0,20})?([a-zA-Z0-9/+=]{40})/gi,
  placeholder: "[AWS_SECRET_{n}]",
  priority: 98,
  severity: "high",
  description: "AWS Secret Access Key",
  validator: (_value, context) => {
    return /aws|amazon|secret|access.key/i.test(context);
  }
};
var GOOGLE_API_KEY = {
  type: "GOOGLE_API_KEY",
  regex: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  placeholder: "[GOOGLE_API_{n}]",
  priority: 95,
  severity: "high",
  description: "Google API Key"
};
var STRIPE_API_KEY = {
  type: "STRIPE_API_KEY",
  regex: /\b((sk|pk)_(live|test)_[0-9a-zA-Z]{24,})\b/g,
  placeholder: "[STRIPE_KEY_{n}]",
  priority: 95,
  severity: "high",
  description: "Stripe API Keys"
};
var GITHUB_TOKEN = {
  type: "GITHUB_TOKEN",
  regex: /\b(gh[pousr]_[A-Za-z0-9]{36,})\b/g,
  placeholder: "[GITHUB_TOKEN_{n}]",
  priority: 95,
  severity: "high",
  description: "GitHub Personal Access Token"
};
var JWT_TOKEN = {
  type: "JWT_TOKEN",
  regex: /\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g,
  placeholder: "[JWT_{n}]",
  priority: 90,
  severity: "high",
  description: "JSON Web Token (JWT)"
};
var GENERIC_API_KEY = {
  type: "GENERIC_API_KEY",
  regex: /\b(?:api.{0,5}key|apikey|api.token)[:\s=]+([a-zA-Z0-9_\-]{20,})\b/gi,
  placeholder: "[API_KEY_{n}]",
  priority: 85,
  severity: "high",
  description: "Generic API key pattern",
  validator: (value, context) => {
    const excluded = /example|sample|test|fake|demo|placeholder|xxx/i;
    return !excluded.test(value) && !excluded.test(context);
  }
};
var GENERIC_SECRET = {
  type: "GENERIC_SECRET",
  regex: /\b(?:password|passwd|pwd|secret)[:\s=]+([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{8,})\b/gi,
  placeholder: "[SECRET_{n}]",
  priority: 90,
  severity: "high",
  description: "Generic passwords and secrets",
  validator: (value, _context) => {
    return !/example|sample|test|fake|demo|placeholder|xxx|password|secret|\*+/i.test(value) && value.length >= 8;
  }
};
var PRIVATE_KEY = {
  type: "PRIVATE_KEY",
  regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]{20,}?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
  placeholder: "[PRIVATE_KEY_{n}]",
  priority: 98,
  severity: "high",
  description: "RSA/EC Private Keys"
};
var SSH_PRIVATE_KEY = {
  type: "SSH_PRIVATE_KEY",
  regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]{20,}?-----END OPENSSH PRIVATE KEY-----/g,
  placeholder: "[SSH_KEY_{n}]",
  priority: 98,
  severity: "high",
  description: "SSH Private Keys"
};
var DATABASE_CONNECTION = {
  type: "DATABASE_CONNECTION",
  regex: /(?:postgres|mysql|mongodb|redis|sqlite):\/\/[^\s:]+:[^\s@]+@[^\s]+/gi,
  placeholder: "[DB_CONN_{n}]",
  priority: 95,
  severity: "high",
  description: "Database connection strings with credentials"
};
var AWS_ARN = {
  type: "AWS_ARN",
  regex: /\b(arn:aws:[a-z0-9\-]+:[a-z0-9\-]*:[0-9]{12}:[a-zA-Z0-9\/\-_:]+)\b/g,
  placeholder: "[AWS_ARN_{n}]",
  priority: 75,
  severity: "medium",
  description: "AWS Amazon Resource Name",
  validator: (_value, context) => {
    return /aws|amazon|cloud|arn|resource/i.test(context);
  }
};
var DOCKER_AUTH = {
  type: "DOCKER_AUTH",
  regex: /\{[^}]*"auth"\s*:\s*"([A-Za-z0-9+/=]{20,})"[^}]*\}/g,
  placeholder: "[DOCKER_AUTH_{n}]",
  priority: 90,
  severity: "high",
  description: "Docker authentication tokens"
};
var SLACK_WEBHOOK = {
  type: "SLACK_WEBHOOK",
  regex: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/g,
  placeholder: "[SLACK_WEBHOOK_{n}]",
  priority: 90,
  severity: "high",
  description: "Slack incoming webhook URLs"
};
var SLACK_TOKEN = {
  type: "SLACK_TOKEN",
  regex: /\b(xox[baprs]-[0-9a-zA-Z\-]{10,})\b/g,
  placeholder: "[SLACK_TOKEN_{n}]",
  priority: 95,
  severity: "high",
  description: "Slack API tokens"
};
var TWILIO_API_KEY = {
  type: "TWILIO_API_KEY",
  regex: /\b(SK[a-z0-9]{32})\b/g,
  placeholder: "[TWILIO_KEY_{n}]",
  priority: 90,
  severity: "high",
  description: "Twilio API Keys",
  validator: (_value, context) => {
    return /twilio|sms|phone|messaging/i.test(context);
  }
};
var MAILGUN_API_KEY = {
  type: "MAILGUN_API_KEY",
  regex: /\b(key-[a-z0-9]{32})\b/g,
  placeholder: "[MAILGUN_KEY_{n}]",
  priority: 85,
  severity: "high",
  description: "Mailgun API Keys",
  validator: (_value, context) => {
    return /mailgun|email|mail/i.test(context);
  }
};
var SENDGRID_API_KEY = {
  type: "SENDGRID_API_KEY",
  regex: /\b(SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43})\b/g,
  placeholder: "[SENDGRID_KEY_{n}]",
  priority: 90,
  severity: "high",
  description: "SendGrid API Keys"
};
var SESSION_ID = {
  type: "SESSION_ID",
  regex: /\b(?:session|sess|sid)[:\s=]+([a-f0-9]{32,})\b/gi,
  placeholder: "[SESSION_{n}]",
  priority: 80,
  severity: "medium",
  description: "Session identifiers",
  validator: (value, _context) => {
    return value.length >= 32 && /^[a-f0-9]+$/.test(value);
  }
};
var BEARER_TOKEN = {
  type: "BEARER_TOKEN",
  regex: /\bBearer\s+([a-zA-Z0-9_\-\.]{20,})/g,
  placeholder: "[BEARER_{n}]",
  priority: 90,
  severity: "high",
  description: "Bearer authentication tokens"
};
var AZURE_RESOURCE_ID = {
  type: "AZURE_RESOURCE_ID",
  regex: /\/subscriptions\/[a-f0-9\-]{36}\/resourceGroups\/[a-zA-Z0-9\-_]+\/providers\/[a-zA-Z0-9\.\-_\/]+/gi,
  placeholder: "[AZURE_RES_{n}]",
  priority: 75,
  severity: "medium",
  description: "Azure Resource IDs",
  validator: (_value, context) => {
    return /azure|microsoft|cloud|resource/i.test(context);
  }
};
var AZURE_STORAGE_KEY = {
  type: "AZURE_STORAGE_KEY",
  regex: /\b(?:DefaultEndpointsProtocol|AccountKey)=([a-zA-Z0-9+/=]{88})/g,
  placeholder: "[AZURE_KEY_{n}]",
  priority: 95,
  severity: "high",
  description: "Azure Storage Account Keys",
  validator: (_value, context) => {
    return /azure|storage|account|connection/i.test(context);
  }
};
var GCP_SERVICE_ACCOUNT = {
  type: "GCP_SERVICE_ACCOUNT",
  regex: /\{[^}]*"type"\s*:\s*"service_account"[^}]*"private_key_id"\s*:\s*"([a-z0-9]{40})"[^}]*\}/gi,
  placeholder: "[GCP_SA_{n}]",
  priority: 95,
  severity: "high",
  description: "GCP Service Account Keys"
};
var KUBERNETES_SECRET = {
  type: "KUBERNETES_SECRET",
  regex: /\b(?:kind:\s*Secret|apiVersion:\s*v1)\s[\s\S]{0,500}?data:\s*\n\s+[a-zA-Z0-9\-_]+:\s*([A-Za-z0-9+/=]{20,})/g,
  placeholder: "[K8S_SECRET_{n}]",
  priority: 90,
  severity: "high",
  description: "Kubernetes Secret data",
  validator: (_value, context) => {
    return /kubernetes|k8s|secret|configmap/i.test(context);
  }
};
var COOKIE_SESSION = {
  type: "COOKIE_SESSION",
  regex: /\b(?:set-cookie|cookie):\s*(?:session|sessid|sid|auth)=([a-zA-Z0-9_\-\.]{20,})/gi,
  placeholder: "[COOKIE_{n}]",
  priority: 85,
  severity: "medium",
  description: "HTTP session cookies"
};
var NPM_TOKEN = {
  type: "NPM_TOKEN",
  regex: /\b(npm_[A-Za-z0-9]{36})\b/g,
  placeholder: "[NPM_TOKEN_{n}]",
  priority: 90,
  severity: "high",
  description: "NPM authentication tokens"
};
var PYPI_TOKEN = {
  type: "PYPI_TOKEN",
  regex: /\b(pypi-[A-Za-z0-9_\-]{100,})\b/g,
  placeholder: "[PYPI_TOKEN_{n}]",
  priority: 90,
  severity: "high",
  description: "Python PyPI tokens"
};
var HEROKU_API_KEY = {
  type: "HEROKU_API_KEY",
  regex: /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/g,
  placeholder: "[HEROKU_KEY_{n}]",
  priority: 80,
  severity: "high",
  description: "Heroku API keys",
  validator: (_value, context) => {
    return /heroku|api.key|auth/i.test(context);
  }
};
var FIREBASE_API_KEY = {
  type: "FIREBASE_API_KEY",
  regex: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  placeholder: "[FIREBASE_KEY_{n}]",
  priority: 90,
  severity: "high",
  description: "Firebase API keys",
  validator: (_value, context) => {
    return /firebase|google|cloud/i.test(context);
  }
};
var OAUTH_CLIENT_SECRET = {
  type: "OAUTH_CLIENT_SECRET",
  regex: /\b(?:client.?secret|consumer.?secret)[:=\s]+([a-zA-Z0-9_\-]{20,})/gi,
  placeholder: "[OAUTH_SECRET_{n}]",
  priority: 95,
  severity: "high",
  description: "OAuth client secrets",
  validator: (value, _context) => {
    return !/example|sample|test|fake|demo|placeholder/i.test(value);
  }
};
var OAUTH_TOKEN = {
  type: "OAUTH_TOKEN",
  regex: /\b(?:oauth.?token|access.?token)[:=\s]+([a-zA-Z0-9_\-\.]{20,})/gi,
  placeholder: "[OAUTH_TOKEN_{n}]",
  priority: 85,
  severity: "high",
  description: "OAuth access tokens",
  validator: (value, _context) => {
    return !/example|sample|test|fake|demo|placeholder/i.test(value) && value.length >= 20;
  }
};
var technologyPatterns = [
  AWS_ACCESS_KEY,
  OPENAI_API_KEY,
  AWS_SECRET_KEY,
  GOOGLE_API_KEY,
  STRIPE_API_KEY,
  GITHUB_TOKEN,
  JWT_TOKEN,
  GENERIC_API_KEY,
  GENERIC_SECRET,
  PRIVATE_KEY,
  SSH_PRIVATE_KEY,
  DATABASE_CONNECTION,
  AWS_ARN,
  DOCKER_AUTH,
  SLACK_WEBHOOK,
  SLACK_TOKEN,
  TWILIO_API_KEY,
  MAILGUN_API_KEY,
  SENDGRID_API_KEY,
  SESSION_ID,
  BEARER_TOKEN,
  AZURE_RESOURCE_ID,
  AZURE_STORAGE_KEY,
  GCP_SERVICE_ACCOUNT,
  KUBERNETES_SECRET,
  COOKIE_SESSION,
  NPM_TOKEN,
  PYPI_TOKEN,
  HEROKU_API_KEY,
  FIREBASE_API_KEY,
  OAUTH_CLIENT_SECRET,
  OAUTH_TOKEN
];
var CASE_NUMBER = {
  type: "CASE_NUMBER",
  regex: /\b(?:CASE|DOCKET|FILE)[-\s]?(?:NO|NUM(?:BER)?|REF)?[-\s]?[:#]?\s*([A-Z]{1,3}[-]?\d{2,4}[-]?[A-Z]{0,3}[-]?\d{4,8})\b/gi,
  placeholder: "[CASE_{n}]",
  priority: 85,
  severity: "high",
  description: "Court case and docket numbers"
};
var MATTER_NUMBER = {
  type: "MATTER_NUMBER",
  regex: /\b(?:MATTER|ENGAGEMENT|CLIENT[-\s]?MATTER)[-\s]?(?:NO|NUM(?:BER)?|REF|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[MATTER_{n}]",
  priority: 80,
  severity: "high",
  description: "Law firm matter and engagement numbers",
  validator: (_value, context) => {
    return /legal|matter|client|engagement|firm|attorney|counsel/i.test(context);
  }
};
var BAR_NUMBER = {
  type: "BAR_NUMBER",
  regex: /\b(?:BAR|ATTORNEY|LAWYER)[-\s]?(?:NO|NUM(?:BER)?|REG(?:ISTRATION)?|LIC(?:ENSE)?)?[-\s]?[:#]?\s*([A-Z0-9]{5,12})\b/gi,
  placeholder: "[BAR_{n}]",
  priority: 85,
  severity: "high",
  description: "Attorney bar registration numbers"
};
var EXHIBIT_NUMBER = {
  type: "EXHIBIT_NUMBER",
  regex: /\bEXHIBIT[-\s]?([A-Z]{1,2}[-]?\d{1,4})\b/gi,
  placeholder: "[EXHIBIT_{n}]",
  priority: 70,
  severity: "medium",
  description: "Legal exhibit reference numbers",
  validator: (_value, context) => {
    return /exhibit|evidence|document|trial|hearing|deposition/i.test(context);
  }
};
var DEPOSITION_REF = {
  type: "DEPOSITION_REF",
  regex: /\b(?:DEPOSITION|DEPO|DEP)[-\s]?(?:NO|NUM(?:BER)?|REF|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[DEPO_{n}]",
  priority: 75,
  severity: "medium",
  description: "Deposition reference numbers",
  validator: (_value, context) => {
    return /deposition|depo|testimony|transcript|witness/i.test(context);
  }
};
var DISCOVERY_NUMBER = {
  type: "DISCOVERY_NUMBER",
  regex: /\b(?:DISCOVERY|INTERROGATORY|REQUEST|RFP|RFA)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{1,4}[-]?\d{1,4})\b/gi,
  placeholder: "[DISCOVERY_{n}]",
  priority: 75,
  severity: "medium",
  description: "Discovery request, interrogatory, and production numbers"
};
var COURT_REPORTER_LICENSE = {
  type: "COURT_REPORTER_LICENSE",
  regex: /\b(?:COURT[-\s]?REPORTER|CSR|RPR)[-\s]?(?:LIC(?:ENSE)?|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{2,3}[-]?\d{4,8})\b/gi,
  placeholder: "[CSR_{n}]",
  priority: 75,
  severity: "medium",
  description: "Court reporter license numbers"
};
var SUBPOENA_NUMBER = {
  type: "SUBPOENA_NUMBER",
  regex: /\b(?:SUBPOENA|SUMMONS)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[SUBPOENA_{n}]",
  priority: 80,
  severity: "high",
  description: "Subpoena and summons numbers"
};
var JUDGMENT_NUMBER = {
  type: "JUDGMENT_NUMBER",
  regex: /\b(?:JUDGMENT|ORDER|DECREE)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[JUDGMENT_{n}]",
  priority: 80,
  severity: "high",
  description: "Court judgment and order numbers",
  validator: (_value, context) => {
    return /judgment|order|decree|ruling|decision|court/i.test(context);
  }
};
var PATENT_NUMBER = {
  type: "PATENT_NUMBER",
  regex: /\b(?:(?:US|EP|WO|PCT)[-\s]?)?(?:PATENT|PAT)[-\s]?(?:NO|NUM(?:BER)?|APPL(?:ICATION)?)?[-\s]?[:#]?\s*([A-Z]{0,2}\d{6,10}[A-Z0-9]{0,3})\b/gi,
  placeholder: "[PATENT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Patent and trademark application numbers"
};
var SETTLEMENT_ID = {
  type: "SETTLEMENT_ID",
  regex: /\b(?:SETTLEMENT|AGREEMENT)[-\s]?(?:ID|NO|NUM(?:BER)?|REF)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[SETTLEMENT_{n}]",
  priority: 85,
  severity: "high",
  description: "Settlement agreement identifiers",
  validator: (_value, context) => {
    return /settlement|agreement|resolution|mediation|arbitration/i.test(context);
  }
};
var CLIENT_ID = {
  type: "CLIENT_ID",
  regex: /\b(?:CLIENT)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[CLIENT_{n}]",
  priority: 90,
  severity: "high",
  description: "Law firm client identifiers",
  validator: (_value, context) => {
    return /client|legal|matter|billing|invoice|retainer/i.test(context);
  }
};
var RETAINER_NUMBER = {
  type: "RETAINER_NUMBER",
  regex: /\b(?:RETAINER)[-\s]?(?:NO|NUM(?:BER)?|AGREEMENT)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RETAINER_{n}]",
  priority: 80,
  severity: "high",
  description: "Retainer agreement numbers"
};
var NOTARY_LICENSE = {
  type: "NOTARY_LICENSE",
  regex: /\b(?:NOTARY|NOTARIAL)[-\s]?(?:LIC(?:ENSE)?|COMMISSION|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[NOTARY_{n}]",
  priority: 75,
  severity: "medium",
  description: "Notary public license and commission numbers"
};
var BANKRUPTCY_CASE = {
  type: "BANKRUPTCY_CASE",
  regex: /\b(?:BK|BANKRUPTCY)[-\s]?(?:NO|NUM(?:BER)?|CASE)?[-\s]?[:#]?\s*(\d{2}[-]?\d{5}[-]?[A-Z]{0,3})\b/gi,
  placeholder: "[BK_{n}]",
  priority: 85,
  severity: "high",
  description: "Bankruptcy case numbers"
};
var PROBATE_CASE = {
  type: "PROBATE_CASE",
  regex: /\b(?:PROBATE|ESTATE)[-\s]?(?:NO|NUM(?:BER)?|CASE)?[-\s]?[:#]?\s*([A-Z]{1,2}\d{6,10})\b/gi,
  placeholder: "[PROBATE_{n}]",
  priority: 85,
  severity: "high",
  description: "Probate and estate case numbers",
  validator: (_value, context) => {
    return /probate|estate|will|trust|inheritance|decedent/i.test(context);
  }
};
var NDA_ID = {
  type: "NDA_ID",
  regex: /\b(?:NDA|CONFIDENTIALITY|NON[-\s]?DISCLOSURE)[-\s]?(?:AGREEMENT)?[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[NDA_{n}]",
  priority: 75,
  severity: "high",
  description: "Non-disclosure and confidentiality agreement numbers"
};
var CONTRACT_REFERENCE$1 = {
  type: "CONTRACT_REFERENCE",
  regex: /\bCNTR[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{8})\b/gi,
  placeholder: "[CONTRACT_{n}]",
  priority: 85,
  severity: "high",
  description: "Contract reference codes"
};
var legalPatterns = [
  CASE_NUMBER,
  MATTER_NUMBER,
  BAR_NUMBER,
  EXHIBIT_NUMBER,
  DEPOSITION_REF,
  DISCOVERY_NUMBER,
  COURT_REPORTER_LICENSE,
  SUBPOENA_NUMBER,
  JUDGMENT_NUMBER,
  PATENT_NUMBER,
  SETTLEMENT_ID,
  CLIENT_ID,
  RETAINER_NUMBER,
  NOTARY_LICENSE,
  BANKRUPTCY_CASE,
  PROBATE_CASE,
  NDA_ID,
  CONTRACT_REFERENCE$1
];
var STUDENT_ID = {
  type: "STUDENT_ID",
  regex: /\b(?:STUDENT|PUPIL|SCHOLAR)[-\s]?(?:ID|NUM(?:BER)?|NO)?[-\s]?[:#]?\s*([A-Z]{0,2}\d{6,10})\b/gi,
  placeholder: "[STUDENT_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Student identification numbers"
};
var UNIVERSITY_ID = {
  type: "UNIVERSITY_ID",
  regex: /\b(?:UNIVERSITY|COLLEGE|UNI)[-\s]?(?:ID|NUM(?:BER)?|NO)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[UNI_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "University and college ID numbers",
  validator: (_value, context) => {
    return /university|college|campus|student|enrollment|registr/i.test(context);
  }
};
var COURSE_CODE = {
  type: "COURSE_CODE",
  regex: /\b([A-Z]{2,4}\s?\d{3,4}[A-Z]?)\b/g,
  placeholder: "[COURSE_{n}]",
  priority: 60,
  severity: "low",
  description: "Course codes and numbers",
  validator: (value, context) => {
    const academicContext = /course|class|section|semester|quarter|curriculum|syllabus/i.test(context);
    const validFormat = /^[A-Z]{2,4}\s?\d{3,4}[A-Z]?$/.test(value);
    return academicContext && validFormat;
  }
};
var GRADE_REFERENCE = {
  type: "GRADE_REFERENCE",
  regex: /\b(?:GPA|GRADE[-\s]?POINT[-\s]?AVERAGE)[-\s]?[:#]?\s*((?:[0-4]\.\d{1,2})|(?:\d\.\d{2}))\b/gi,
  placeholder: "[GPA_{n}]",
  priority: 80,
  severity: "high",
  description: "Grade Point Average (GPA) references"
};
var TRANSCRIPT_ID = {
  type: "TRANSCRIPT_ID",
  regex: /\b(?:TRANSCRIPT)[-\s]?(?:ID|NUM(?:BER)?|NO|REF)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TRANSCRIPT_{n}]",
  priority: 85,
  severity: "high",
  description: "Academic transcript identifiers"
};
var LIBRARY_CARD = {
  type: "LIBRARY_CARD",
  regex: /\b(?:LIBRARY)[-\s]?(?:CARD|ID|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[LIBRARY_{n}]",
  priority: 70,
  severity: "medium",
  description: "Library card numbers"
};
var FACULTY_ID = {
  type: "FACULTY_ID",
  regex: /\b(?:FACULTY|TEACHER|INSTRUCTOR|PROFESSOR|STAFF)[-\s]?(?:ID|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{1,2}\d{6,10})\b/gi,
  placeholder: "[FACULTY_{n}]",
  priority: 85,
  severity: "high",
  description: "Faculty and teacher identification numbers",
  validator: (_value, context) => {
    return /faculty|teacher|instructor|professor|staff|employee|personnel/i.test(context);
  }
};
var ENROLLMENT_NUMBER = {
  type: "ENROLLMENT_NUMBER",
  regex: /\b(?:ENROLLMENT|REGISTRATION)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ENROLLMENT_{n}]",
  priority: 80,
  severity: "high",
  description: "Course enrollment and registration numbers"
};
var FINANCIAL_AID_ID = {
  type: "FINANCIAL_AID_ID",
  regex: /\b(?:FINANCIAL[-\s]?AID|FAFSA|AID[-\s]?APPLICATION)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[AID_{n}]",
  priority: 90,
  severity: "high",
  description: "Financial aid and FAFSA identifiers"
};
var DEGREE_NUMBER = {
  type: "DEGREE_NUMBER",
  regex: /\b(?:DEGREE|DIPLOMA|CERTIFICATE)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[DEGREE_{n}]",
  priority: 80,
  severity: "high",
  description: "Degree and certificate numbers",
  validator: (_value, context) => {
    return /degree|diploma|certificate|graduation|credential/i.test(context);
  }
};
var EXAM_ID = {
  type: "EXAM_ID",
  regex: /\b(?:EXAM|TEST|QUIZ|ASSESSMENT)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[EXAM_{n}]",
  priority: 75,
  severity: "medium",
  description: "Examination and test identifiers",
  validator: (_value, context) => {
    return /exam|test|quiz|assessment|midterm|final|score/i.test(context);
  }
};
var EXAM_REGISTRATION_NUMBER = {
  type: "EXAM_REGISTRATION_NUMBER",
  regex: /\bEXAM[-\s]?(\d{4}[-]\d{4})\b/gi,
  placeholder: "[EXAM_REG_{n}]",
  priority: 80,
  severity: "high",
  description: "Exam registration numbers (standardized format)"
};
var HOUSING_ASSIGNMENT = {
  type: "HOUSING_ASSIGNMENT",
  regex: /\b(?:DORM|ROOM|HOUSING)[-\s]?(?:NO|NUM(?:BER)?|ASSIGNMENT)?[-\s]?[:#]?\s*([A-Z0-9]{4,10})\b/gi,
  placeholder: "[HOUSING_{n}]",
  priority: 75,
  severity: "medium",
  description: "Dormitory and housing assignments",
  validator: (_value, context) => {
    return /dorm|housing|residence|room|building|floor|suite/i.test(context);
  }
};
var MEAL_PLAN_ID = {
  type: "MEAL_PLAN_ID",
  regex: /\b(?:MEAL[-\s]?PLAN|DINING)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[MEAL_{n}]",
  priority: 70,
  severity: "medium",
  description: "Meal plan and dining identifiers"
};
var PARKING_PERMIT = {
  type: "PARKING_PERMIT",
  regex: /\b(?:PARKING)[-\s]?(?:PERMIT|PASS|DECAL)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PARKING_{n}]",
  priority: 70,
  severity: "low",
  description: "Parking permit numbers"
};
var SCHOLARSHIP_ID = {
  type: "SCHOLARSHIP_ID",
  regex: /\b(?:SCHOLARSHIP|GRANT|AWARD)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[SCHOLARSHIP_{n}]",
  priority: 80,
  severity: "high",
  description: "Scholarship and grant award numbers",
  validator: (_value, context) => {
    return /scholarship|grant|award|fellowship|stipend|financial/i.test(context);
  }
};
var GRADUATION_YEAR = {
  type: "GRADUATION_YEAR",
  regex: /\b(?:CLASS[-\s]?OF|GRADUATING[-\s]?CLASS|GRAD(?:UATION)?[-\s]?YEAR)[-\s]?[:#]?\s*(['']?\d{2}|[12]\d{3})\b/gi,
  placeholder: "[GRAD_YEAR_{n}]",
  priority: 65,
  severity: "low",
  description: "Graduation year references"
};
var APPLICATION_ID = {
  type: "APPLICATION_ID",
  regex: /\b(?:APPLICATION|ADMISSION|APPLICANT)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[APPLICATION_{n}]",
  priority: 85,
  severity: "high",
  description: "Admissions application identifiers",
  validator: (_value, context) => {
    return /application|admission|applicant|prospective|admit|enroll/i.test(context);
  }
};
var ALUMNI_ID = {
  type: "ALUMNI_ID",
  regex: /\b(?:ALUMNI|ALUMNUS|ALUMNA)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ALUMNI_{n}]",
  priority: 75,
  severity: "medium",
  description: "Alumni identification numbers"
};
var RESEARCH_GRANT = {
  type: "RESEARCH_GRANT",
  regex: /\b(?:GRANT|RESEARCH|FUNDING)[-\s]?(?:NO|NUM(?:BER)?|ID|REF)?[-\s]?[:#]?\s*([A-Z]{2,4}[-]?\d{6,10})\b/gi,
  placeholder: "[GRANT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Research grant and funding numbers",
  validator: (_value, context) => {
    return /grant|research|funding|nsf|nih|award|project/i.test(context);
  }
};
var DEPARTMENT_CODE = {
  type: "DEPARTMENT_CODE",
  regex: /\b(?:DEPT|DEPARTMENT)[-\s]?(?:CODE)?[-\s]?[:#]?\s*([A-Z]{3,6})\b/g,
  placeholder: "[DEPT_{n}]",
  priority: 55,
  severity: "low",
  description: "Academic department codes",
  validator: (value, context) => {
    const academicContext = /department|college|school|faculty|division/i.test(context);
    const minLength = value.length >= 3;
    return academicContext && minLength;
  }
};
var educationPatterns = [
  STUDENT_ID,
  UNIVERSITY_ID,
  COURSE_CODE,
  GRADE_REFERENCE,
  TRANSCRIPT_ID,
  LIBRARY_CARD,
  FACULTY_ID,
  ENROLLMENT_NUMBER,
  FINANCIAL_AID_ID,
  DEGREE_NUMBER,
  EXAM_ID,
  EXAM_REGISTRATION_NUMBER,
  HOUSING_ASSIGNMENT,
  MEAL_PLAN_ID,
  PARKING_PERMIT,
  SCHOLARSHIP_ID,
  GRADUATION_YEAR,
  APPLICATION_ID,
  ALUMNI_ID,
  RESEARCH_GRANT,
  DEPARTMENT_CODE
];
var EMPLOYEE_ID = {
  type: "EMPLOYEE_ID",
  regex: /\b(?:EMPLOYEE|EMP|STAFF|PERSONNEL|WORKER)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{0,2}\d{4,10})\b/gi,
  placeholder: "[EMP_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Employee identification numbers"
};
var PAYROLL_NUMBER = {
  type: "PAYROLL_NUMBER",
  regex: /\b(?:PAYROLL|PAY)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PAYROLL_{n}]",
  priority: 90,
  severity: "high",
  description: "Payroll identification numbers",
  validator: (_value, context) => {
    return /payroll|salary|compensation|pay|wage|earning/i.test(context);
  }
};
var SALARY_AMOUNT = {
  type: "SALARY_AMOUNT",
  regex: /\b(?:SALARY|COMPENSATION|PAY|WAGE|EARNING)[-\s]?[:#]?\s*(?:[$£€¥]\s?)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)\b/gi,
  placeholder: "[SALARY_{n}]",
  priority: 85,
  severity: "high",
  description: "Salary and compensation amounts",
  validator: (value, context) => {
    const compContext = /salary|compensation|pay|wage|earning|income|annual|hourly/i.test(context);
    const numValue = parseInt(value.replace(/[,\s]/g, ""));
    return compContext && numValue >= 1e3;
  }
};
var PERFORMANCE_REVIEW_ID = {
  type: "PERFORMANCE_REVIEW_ID",
  regex: /\b(?:PERFORMANCE|REVIEW|APPRAISAL|EVALUATION)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[REVIEW_{n}]",
  priority: 80,
  severity: "high",
  description: "Performance review and appraisal identifiers",
  validator: (_value, context) => {
    return /performance|review|appraisal|evaluation|rating|assessment/i.test(context);
  }
};
var JOB_APPLICATION_ID = {
  type: "JOB_APPLICATION_ID",
  regex: /\b(?:APPLICATION|CANDIDATE|APPLICANT)[-\s]?(?:ID|NO|NUM(?:BER)?|REF)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[APPLICATION_{n}]",
  priority: 85,
  severity: "high",
  description: "Job application and candidate identifiers",
  validator: (_value, context) => {
    return /application|candidate|applicant|job|position|recruit|hiring/i.test(context);
  }
};
var RESUME_ID = {
  type: "RESUME_ID",
  regex: /\b(?:RESUME|CV|CURRICULUM[-\s]?VITAE)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RESUME_{n}]",
  priority: 75,
  severity: "medium",
  description: "Resume and CV identifiers"
};
var BENEFITS_PLAN_NUMBER = {
  type: "BENEFITS_PLAN_NUMBER",
  regex: /\b(?:BENEFITS?|INSURANCE|HEALTH[-\s\u00A0]?PLAN)[-\s\u00A0]*(?:PLAN)?[-\s\u00A0]*(?:NO|NUM(?:BER)?|ID)?[-\s\u00A0.:#]*([A-Z0-9](?:[A-Z0-9][\s\u00A0./-]?){5,15}[A-Z0-9])\b/gi,
  placeholder: "[BENEFITS_{n}]",
  priority: 85,
  severity: "high",
  description: "Employee benefits and insurance plan numbers",
  validator: (value, context) => {
    const normalized = value.replace(/[\s\u00A0./-]/g, "");
    const hasDigits = /\d{4,}/.test(normalized);
    const validLength = normalized.length >= 6 && normalized.length <= 14;
    const inContext = /benefit|insurance|health|dental|vision|plan|policy|enrollment/i.test(context);
    return hasDigits && validLength && inContext;
  }
};
var RETIREMENT_ACCOUNT = {
  type: "RETIREMENT_ACCOUNT",
  regex: /\b(?:401K|403B|IRA|RETIREMENT|PENSION)[-\s]?(?:ACCOUNT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[RETIREMENT_{n}]",
  priority: 90,
  severity: "high",
  description: "401(k), IRA, and retirement account numbers",
  validator: (_value, context) => {
    return /401k|403b|ira|retirement|pension|fund|invest|contribution/i.test(context);
  }
};
var DIRECT_DEPOSIT_REF = {
  type: "DIRECT_DEPOSIT_REF",
  regex: /\b(?:DIRECT[-\s]?DEPOSIT|DD|ROUTING)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*(\d{9})\b/g,
  placeholder: "[DD_{n}]",
  priority: 90,
  severity: "high",
  description: "Direct deposit and routing numbers",
  validator: (_value, context) => {
    return /direct[-\s]?deposit|routing|bank|account|payroll|pay/i.test(context);
  }
};
var BACKGROUND_CHECK_ID = {
  type: "BACKGROUND_CHECK_ID",
  regex: /\b(?:BACKGROUND[-\s]?CHECK|BGC|SCREENING)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[BGC_{n}]",
  priority: 85,
  severity: "high",
  description: "Background check and screening identifiers"
};
var DRUG_TEST_ID = {
  type: "DRUG_TEST_ID",
  regex: /\b(?:DRUG[-\s]?TEST|SCREENING|URINALYSIS)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[DRUG_TEST_{n}]",
  priority: 85,
  severity: "high",
  description: "Drug test and screening identifiers",
  validator: (_value, context) => {
    return /drug|test|screening|urinalysis|specimen|sample/i.test(context);
  }
};
var TIMESHEET_NUMBER = {
  type: "TIMESHEET_NUMBER",
  regex: /\b(?:TIMESHEET|TIMECARD|TIME[-\s]?ENTRY)[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TIMESHEET_{n}]",
  priority: 75,
  severity: "medium",
  description: "Timesheet and timecard numbers"
};
var TRAINING_CERT_ID = {
  type: "TRAINING_CERT_ID",
  regex: /\b(?:TRAINING|CERTIFICATION|CERT)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TRAINING_{n}]",
  priority: 70,
  severity: "medium",
  description: "Training and certification identifiers",
  validator: (_value, context) => {
    return /training|certification|cert|course|completion|credential/i.test(context);
  }
};
var EXPENSE_REPORT_NUMBER = {
  type: "EXPENSE_REPORT_NUMBER",
  regex: /\b(?:EXPENSE|REIMBURSEMENT)[-\s]?(?:REPORT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[EXPENSE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Expense report and reimbursement numbers",
  validator: (_value, context) => {
    return /expense|reimbursement|travel|claim|receipt/i.test(context);
  }
};
var LEAVE_REQUEST_ID = {
  type: "LEAVE_REQUEST_ID",
  regex: /\b(?:PTO|LEAVE|VACATION|TIME[-\s]?OFF)[-\s]?(?:REQUEST)?[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[LEAVE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Leave request and time-off identifiers",
  validator: (_value, context) => {
    return /pto|leave|vacation|time[-\s]?off|absence|sick|personal/i.test(context);
  }
};
var EXIT_INTERVIEW_ID = {
  type: "EXIT_INTERVIEW_ID",
  regex: /\b(?:EXIT|TERMINATION|SEPARATION)[-\s]?(?:INTERVIEW)?[-\s]?(?:NO|NUM(?:BER)?|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[EXIT_{n}]",
  priority: 80,
  severity: "high",
  description: "Exit interview and termination identifiers",
  validator: (_value, context) => {
    return /exit|termination|separation|offboard|departure|resign/i.test(context);
  }
};
var DISCIPLINARY_ACTION_ID = {
  type: "DISCIPLINARY_ACTION_ID",
  regex: /\b(?:DISCIPLINARY|INCIDENT|WARNING|VIOLATION)[-\s\u00A0]*(?:ACTION)?[-\s\u00A0]*(?:NO|NUM(?:BER)?|ID)?[-\s\u00A0.:#]*([A-Z0-9](?:[A-Z0-9][\s\u00A0./-]?){5,15}[A-Z0-9])\b/gi,
  placeholder: "[DISCIPLINE_{n}]",
  priority: 85,
  severity: "high",
  description: "Disciplinary action and incident identifiers",
  validator: (value, context) => {
    const normalized = value.replace(/[\s\u00A0./-]/g, "");
    const hasDigits = /\d{3,}/.test(normalized);
    const validLength = normalized.length >= 6 && normalized.length <= 12;
    return hasDigits && validLength && /disciplinary|incident|warning|violation|misconduct|investigation/i.test(context);
  }
};
var EMERGENCY_CONTACT_REF = {
  type: "EMERGENCY_CONTACT_REF",
  regex: /\b(?:EMERGENCY[-\s]?CONTACT|ICE)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[EMERGENCY_{n}]",
  priority: 85,
  severity: "high",
  description: "Emergency contact reference numbers",
  validator: (_value, context) => {
    return /emergency|contact|ice|next[-\s]?of[-\s]?kin/i.test(context);
  }
};
var WORK_PERMIT = {
  type: "WORK_PERMIT",
  regex: /\b(?:WORK[-\s]?PERMIT|VISA|H1B|GREEN[-\s]?CARD|EAD)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,15})\b/gi,
  placeholder: "[WORK_PERMIT_{n}]",
  priority: 90,
  severity: "high",
  description: "Work permits, visas, and immigration documents"
};
var SECURITY_CLEARANCE = {
  type: "SECURITY_CLEARANCE",
  regex: /\b(?:CLEARANCE|SECURITY[-\s]?LEVEL)[-\s]?[:#]?\s*(TOP[-\s]?SECRET|SECRET|CONFIDENTIAL|[A-Z]{2,3}\/SCI)\b/gi,
  placeholder: "[CLEARANCE_{n}]",
  priority: 90,
  severity: "high",
  description: "Security clearance levels and classifications"
};
var RECRUITER_REF = {
  type: "RECRUITER_REF",
  regex: /\b(?:RECRUITER|AGENCY)[-\s]?(?:REF|ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RECRUITER_{n}]",
  priority: 70,
  severity: "medium",
  description: "Recruitment agency reference numbers",
  validator: (_value, context) => {
    return /recruiter|agency|headhunter|placement|referral/i.test(context);
  }
};
var hrPatterns = [
  EMPLOYEE_ID,
  PAYROLL_NUMBER,
  SALARY_AMOUNT,
  PERFORMANCE_REVIEW_ID,
  JOB_APPLICATION_ID,
  RESUME_ID,
  BENEFITS_PLAN_NUMBER,
  RETIREMENT_ACCOUNT,
  DIRECT_DEPOSIT_REF,
  BACKGROUND_CHECK_ID,
  DRUG_TEST_ID,
  TIMESHEET_NUMBER,
  TRAINING_CERT_ID,
  EXPENSE_REPORT_NUMBER,
  LEAVE_REQUEST_ID,
  EXIT_INTERVIEW_ID,
  DISCIPLINARY_ACTION_ID,
  EMERGENCY_CONTACT_REF,
  WORK_PERMIT,
  SECURITY_CLEARANCE,
  RECRUITER_REF
];
var CLAIM_ID = {
  type: "CLAIM_ID",
  regex: /\bCLAIM[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{8,12})\b/gi,
  placeholder: "[CLAIM_{n}]",
  priority: 90,
  severity: "high",
  description: "Insurance claim identification numbers",
  validator: (_value, context) => {
    return /claim|insurance|policy|accident|loss|damage|settlement/i.test(context);
  }
};
var POLICY_NUMBER = {
  type: "POLICY_NUMBER",
  regex: /\bPOLICY[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{2,4}\d{6,10})\b/gi,
  placeholder: "[POLICY_{n}]",
  priority: 90,
  severity: "high",
  description: "Insurance policy numbers"
};
var POLICY_HOLDER_ID = {
  type: "POLICY_HOLDER_ID",
  regex: /\b(?:POLICY[-\s]?HOLDER|INSURED|POLICYHOLDER)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9-]{8,14})\b/gi,
  placeholder: "[HOLDER_{n}]",
  priority: 85,
  severity: "high",
  description: "Policy holder identification numbers"
};
var QUOTE_REFERENCE = {
  type: "QUOTE_REFERENCE",
  regex: /\b(?:QUOTE|QTE)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[QUOTE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Insurance quote reference numbers",
  validator: (_value, context) => {
    return /quote|quotation|estimate|premium|insurance/i.test(context);
  }
};
var INSURANCE_CERTIFICATE = {
  type: "INSURANCE_CERTIFICATE",
  regex: /\b(?:CERTIFICATE|CERT)[-\s]?(?:OF[-\s]?INSURANCE)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[CERT_{n}]",
  priority: 80,
  severity: "high",
  description: "Insurance certificate numbers",
  validator: (_value, context) => {
    return /certificate|insurance|coverage|proof/i.test(context);
  }
};
var ADJUSTER_ID = {
  type: "ADJUSTER_ID",
  regex: /\b(?:ADJUSTER|ADJ)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ADJUSTER_{n}]",
  priority: 75,
  severity: "medium",
  description: "Insurance adjuster identification numbers",
  validator: (_value, context) => {
    return /adjuster|claims|inspector|evaluator/i.test(context);
  }
};
var UNDERWRITER_ID = {
  type: "UNDERWRITER_ID",
  regex: /\b(?:UNDERWRITER|UW)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[UW_{n}]",
  priority: 75,
  severity: "medium",
  description: "Insurance underwriter identification numbers",
  validator: (_value, context) => {
    return /underwriter|underwriting|policy|risk|assessment/i.test(context);
  }
};
var INCIDENT_REPORT_NUMBER = {
  type: "INCIDENT_REPORT_NUMBER",
  regex: /\b(?:INCIDENT|ACCIDENT)[-\s]?(?:REPORT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[INCIDENT_{n}]",
  priority: 85,
  severity: "high",
  description: "Incident and accident report numbers",
  validator: (_value, context) => {
    return /incident|accident|report|event|occurrence|loss/i.test(context);
  }
};
var PREMIUM_PAYMENT_REF = {
  type: "PREMIUM_PAYMENT_REF",
  regex: /\b(?:PREMIUM)[-\s]?(?:PAYMENT)?[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[PREMIUM_{n}]",
  priority: 80,
  severity: "medium",
  description: "Premium payment reference numbers"
};
var REINSURANCE_TREATY = {
  type: "REINSURANCE_TREATY",
  regex: /\b(?:REINSURANCE|TREATY)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[TREATY_{n}]",
  priority: 75,
  severity: "medium",
  description: "Reinsurance treaty numbers",
  validator: (_value, context) => {
    return /reinsurance|treaty|cession|facultative/i.test(context);
  }
};
var insurancePatterns = [
  CLAIM_ID,
  POLICY_NUMBER,
  POLICY_HOLDER_ID,
  QUOTE_REFERENCE,
  INSURANCE_CERTIFICATE,
  ADJUSTER_ID,
  UNDERWRITER_ID,
  INCIDENT_REPORT_NUMBER,
  PREMIUM_PAYMENT_REF,
  REINSURANCE_TREATY
];
var ORDER_NUMBER = {
  type: "ORDER_NUMBER",
  regex: /\b(?:ORD(?:ER)?[-\s](?:NO|NUM(?:BER)?)?[-\s:#]?\s*|ORDER\s+(?:NO|NUM(?:BER)?)?[:\s]+)([A-Z0-9-]{8,14})\b/gi,
  placeholder: "[ORDER_{n}]",
  priority: 90,
  severity: "medium",
  description: "E-commerce order numbers",
  validator: (value, _context) => {
    return /\d/.test(value);
  }
};
var LOYALTY_CARD_NUMBER = {
  type: "LOYALTY_CARD_NUMBER",
  regex: /\bLOYALTY[-\s]?(?:CARD)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{10,16})\b/gi,
  placeholder: "[LOYALTY_{n}]",
  priority: 80,
  severity: "medium",
  description: "Customer loyalty card numbers",
  validator: (_value, context) => {
    return /loyalty|rewards|points|membership|customer/i.test(context);
  }
};
var CUSTOMER_ID = {
  type: "CUSTOMER_ID",
  regex: /\b(?:CUSTOMER|CUST)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[CUSTOMER_{n}]",
  priority: 85,
  severity: "high",
  description: "Customer identification numbers",
  validator: (_value, context) => {
    return /customer|account|profile|user|buyer/i.test(context);
  }
};
var DEVICE_ID_TAG = {
  type: "DEVICE_ID_TAG",
  regex: /\bDEVID:([A-F0-9]{16})\b/gi,
  placeholder: "[DEVICE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Device identification tags"
};
var GIFT_CARD_NUMBER = {
  type: "GIFT_CARD_NUMBER",
  regex: /\b(?:GIFT[-\s]?CARD|GC)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{12,19})\b/gi,
  placeholder: "[GIFTCARD_{n}]",
  priority: 85,
  severity: "high",
  description: "Gift card numbers",
  validator: (_value, context) => {
    return /gift|card|voucher|coupon|certificate/i.test(context);
  }
};
var RMA_NUMBER = {
  type: "RMA_NUMBER",
  regex: /\b(?:RMA|RETURN)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[RMA_{n}]",
  priority: 80,
  severity: "medium",
  description: "Return merchandise authorization numbers",
  validator: (_value, context) => {
    return /rma|return|refund|exchange|merchandise/i.test(context);
  }
};
var SHIPPING_TRACKING = {
  type: "SHIPPING_TRACKING",
  regex: /\b(?:TRACKING|TRACK)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{10,30})\b/gi,
  placeholder: "[TRACKING_{n}]",
  priority: 75,
  severity: "medium",
  description: "Shipping and delivery tracking numbers",
  validator: (_value, context) => {
    return /tracking|shipment|delivery|package|parcel|courier/i.test(context);
  }
};
var INVOICE_NUMBER = {
  type: "INVOICE_NUMBER",
  regex: /\b(?:INVOICE|INV)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[INVOICE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Invoice numbers",
  validator: (_value, context) => {
    return /invoice|bill|payment|receipt|purchase/i.test(context);
  }
};
var CART_SESSION_ID = {
  type: "CART_SESSION_ID",
  regex: /\b(?:CART|SESSION)[-\s]?(?:ID)?[-\s]?[:#]?\s*([a-f0-9]{32,64})\b/gi,
  placeholder: "[CART_{n}]",
  priority: 70,
  severity: "low",
  description: "Shopping cart session identifiers",
  validator: (_value, context) => {
    return /cart|session|basket|checkout/i.test(context);
  }
};
var PROMO_CODE = {
  type: "PROMO_CODE",
  regex: /\b(?:PROMO|COUPON|DISCOUNT)[-\s]?(?:CODE)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[PROMO_{n}]",
  priority: 65,
  severity: "low",
  description: "Promotional and coupon codes",
  validator: (_value, context) => {
    return /promo|coupon|discount|code|voucher|offer/i.test(context);
  }
};
var WISHLIST_ID = {
  type: "WISHLIST_ID",
  regex: /\b(?:WISHLIST|WISH[-\s]?LIST)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[WISHLIST_{n}]",
  priority: 70,
  severity: "low",
  description: "Customer wishlist identifiers",
  validator: (_value, context) => {
    return /wishlist|wish|list|saved|favorite/i.test(context);
  }
};
var PRODUCT_SKU = {
  type: "PRODUCT_SKU",
  regex: /\bSKU[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[SKU_{n}]",
  priority: 60,
  severity: "low",
  description: "Product stock keeping units"
};
var retailPatterns = [
  ORDER_NUMBER,
  LOYALTY_CARD_NUMBER,
  CUSTOMER_ID,
  DEVICE_ID_TAG,
  GIFT_CARD_NUMBER,
  RMA_NUMBER,
  SHIPPING_TRACKING,
  INVOICE_NUMBER,
  CART_SESSION_ID,
  PROMO_CODE,
  WISHLIST_ID,
  PRODUCT_SKU
];
var TELECOMS_ACCOUNT_NUMBER = {
  type: "TELECOMS_ACCOUNT_NUMBER",
  regex: /\bACC(?:OUNT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{8,12})\b/gi,
  placeholder: "[ACCOUNT_{n}]",
  priority: 90,
  severity: "high",
  description: "Telecommunications customer account numbers",
  validator: (_value, context) => {
    return /account|customer|subscriber|service|utility|telecom/i.test(context);
  }
};
var METER_SERIAL_NUMBER = {
  type: "METER_SERIAL_NUMBER",
  regex: /\bMTR[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{8,12})\b/gi,
  placeholder: "[METER_{n}]",
  priority: 85,
  severity: "high",
  description: "Utility meter serial numbers"
};
var IMSI_NUMBER = {
  type: "IMSI_NUMBER",
  regex: /\bIMSI[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{15})\b/gi,
  placeholder: "[IMSI_{n}]",
  priority: 90,
  severity: "high",
  description: "International Mobile Subscriber Identity numbers"
};
var IMEI_NUMBER = {
  type: "IMEI_NUMBER",
  regex: /\bIMEI[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{15})\b/gi,
  placeholder: "[IMEI_{n}]",
  priority: 90,
  severity: "high",
  description: "International Mobile Equipment Identity numbers"
};
var SIM_CARD_NUMBER = {
  type: "SIM_CARD_NUMBER",
  regex: /\bSIM[-\s]?(?:CARD)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{19,20})\b/gi,
  placeholder: "[SIM_{n}]",
  priority: 85,
  severity: "high",
  description: "SIM card identification numbers",
  validator: (_value, context) => {
    return /sim|card|mobile|cellular|phone/i.test(context);
  }
};
var SERVICE_REQUEST_NUMBER = {
  type: "SERVICE_REQUEST_NUMBER",
  regex: /\b(?:SERVICE|SR)[-\s]?(?:REQUEST)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[SERVICE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Service request and ticket numbers",
  validator: (_value, context) => {
    return /service|request|ticket|support|maintenance|repair/i.test(context);
  }
};
var UTILITY_BILL_ACCOUNT = {
  type: "UTILITY_BILL_ACCOUNT",
  regex: /\b(?:BILL|BILLING)[-\s]?(?:ACCOUNT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{8,14})\b/gi,
  placeholder: "[BILL_{n}]",
  priority: 85,
  severity: "high",
  description: "Utility billing account numbers",
  validator: (_value, context) => {
    return /bill|billing|utility|electric|gas|water|energy/i.test(context);
  }
};
var INSTALLATION_REF = {
  type: "INSTALLATION_REF",
  regex: /\b(?:INSTALLATION|INSTALL)[-\s]?(?:REF(?:ERENCE)?|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[INSTALL_{n}]",
  priority: 75,
  severity: "medium",
  description: "Installation reference numbers",
  validator: (_value, context) => {
    return /installation|install|setup|deployment|activation/i.test(context);
  }
};
var PHONE_LINE_NUMBER = {
  type: "PHONE_LINE_NUMBER",
  regex: /\b(?:LINE|NUMBER)[-\s]?(?:NO)?[-\s]?[:#]?\s*(\d{3}[-\s]?\d{3}[-\s]?\d{4})\b/g,
  placeholder: "[PHONE_{n}]",
  priority: 90,
  severity: "high",
  description: "Phone line numbers",
  validator: (_value, context) => {
    return /phone|line|number|mobile|landline|telephone/i.test(context);
  }
};
var BROADBAND_SERVICE_ID = {
  type: "BROADBAND_SERVICE_ID",
  regex: /\b(?:BROADBAND|INTERNET|ISP)[-\s]?(?:SERVICE)?[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[BROADBAND_{n}]",
  priority: 80,
  severity: "high",
  description: "Broadband and internet service identifiers",
  validator: (_value, context) => {
    return /broadband|internet|isp|connection|service/i.test(context);
  }
};
var EQUIPMENT_SERIAL = {
  type: "EQUIPMENT_SERIAL",
  regex: /\b(?:EQUIPMENT|DEVICE|ROUTER|MODEM)[-\s]?(?:SERIAL)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{10,16})\b/gi,
  placeholder: "[EQUIPMENT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Equipment and device serial numbers",
  validator: (_value, context) => {
    return /equipment|device|router|modem|serial|hardware/i.test(context);
  }
};
var SMART_METER_ID = {
  type: "SMART_METER_ID",
  regex: /\b(?:SMART[-\s]?METER)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{10,16})\b/gi,
  placeholder: "[SMART_METER_{n}]",
  priority: 85,
  severity: "high",
  description: "Smart meter identification numbers",
  validator: (_value, context) => {
    return /smart|meter|energy|electric|gas|monitoring/i.test(context);
  }
};
var telecomsPatterns = [
  TELECOMS_ACCOUNT_NUMBER,
  METER_SERIAL_NUMBER,
  IMSI_NUMBER,
  IMEI_NUMBER,
  SIM_CARD_NUMBER,
  SERVICE_REQUEST_NUMBER,
  UTILITY_BILL_ACCOUNT,
  INSTALLATION_REF,
  PHONE_LINE_NUMBER,
  BROADBAND_SERVICE_ID,
  EQUIPMENT_SERIAL,
  SMART_METER_ID
];
var SUPPLIER_ID$1 = {
  type: "SUPPLIER_ID",
  regex: /\bSUPP(?:LIER)?[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{2}\d{5,8})\b/gi,
  placeholder: "[SUPPLIER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Supplier identification numbers"
};
var PART_NUMBER = {
  type: "PART_NUMBER",
  regex: /\bP(?:ART)?N[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([0-9A-Z]{6,12})\b/gi,
  placeholder: "[PART_{n}]",
  priority: 70,
  severity: "low",
  description: "Part numbers and component identifiers",
  validator: (_value, context) => {
    return /part|component|item|sku|product|inventory/i.test(context);
  }
};
var PURCHASE_ORDER_NUMBER = {
  type: "PURCHASE_ORDER_NUMBER",
  regex: /\bP(?:URCHASE[-\s]?)?O(?:RDER)?[-\s]+(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[PO_{n}]",
  priority: 85,
  severity: "medium",
  description: "Purchase order numbers"
};
var WORK_ORDER_NUMBER = {
  type: "WORK_ORDER_NUMBER",
  regex: /\bW(?:ORK[-\s]?)?O(?:RDER)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[WO_{n}]",
  priority: 80,
  severity: "medium",
  description: "Work order numbers",
  validator: (_value, context) => {
    return /work|order|job|task|production/i.test(context);
  }
};
var BATCH_LOT_NUMBER = {
  type: "BATCH_LOT_NUMBER",
  regex: /\b(?:BATCH|LOT)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[BATCH_{n}]",
  priority: 75,
  severity: "medium",
  description: "Batch and lot numbers for manufacturing traceability",
  validator: (_value, context) => {
    return /batch|lot|production|manufacturing|quality/i.test(context);
  }
};
var MANUFACTURING_SERIAL = {
  type: "MANUFACTURING_SERIAL",
  regex: /\b(?:SERIAL|SN)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[SERIAL_{n}]",
  priority: 80,
  severity: "medium",
  description: "Product and component serial numbers",
  validator: (_value, context) => {
    return /serial|sn|product|device|unit|item/i.test(context);
  }
};
var VENDOR_CODE = {
  type: "VENDOR_CODE",
  regex: /\bVEND(?:OR)?[-\s]?(?:CODE)?[-\s]?[:#]?\s*([A-Z0-9]{4,10})\b/gi,
  placeholder: "[VENDOR_{n}]",
  priority: 75,
  severity: "medium",
  description: "Vendor codes and identifiers",
  validator: (_value, context) => {
    return /vendor|supplier|partner|contractor/i.test(context);
  }
};
var BOM_NUMBER = {
  type: "BOM_NUMBER",
  regex: /\bBOM[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[BOM_{n}]",
  priority: 75,
  severity: "medium",
  description: "Bill of materials numbers",
  validator: (_value, context) => {
    return /bom|bill|materials|assembly|component/i.test(context);
  }
};
var QC_CERTIFICATE_NUMBER = {
  type: "QC_CERTIFICATE_NUMBER",
  regex: /\b(?:QC|QUALITY)[-\s]?(?:CERT(?:IFICATE)?)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[QC_{n}]",
  priority: 80,
  severity: "medium",
  description: "Quality control certificate numbers",
  validator: (_value, context) => {
    return /quality|qc|certificate|inspection|test|compliance/i.test(context);
  }
};
var CONTAINER_NUMBER = {
  type: "CONTAINER_NUMBER",
  regex: /\b(?:CONTAINER|CNTR)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{4}\d{7})\b/gi,
  placeholder: "[CONTAINER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Shipping container numbers (ISO 6346 format)",
  validator: (value) => {
    return /^[A-Z]{4}\d{7}$/.test(value);
  }
};
var PALLET_ID = {
  type: "PALLET_ID",
  regex: /\bPALLET[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[PALLET_{n}]",
  priority: 70,
  severity: "low",
  description: "Pallet identification numbers",
  validator: (_value, context) => {
    return /pallet|shipping|warehouse|logistics/i.test(context);
  }
};
var ROUTING_NUMBER_MFG = {
  type: "ROUTING_NUMBER_MFG",
  regex: /\bROUTING[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ROUTING_{n}]",
  priority: 75,
  severity: "medium",
  description: "Manufacturing routing numbers",
  validator: (_value, context) => {
    return /routing|manufacturing|process|production|workflow/i.test(context);
  }
};
var RFQ_NUMBER$1 = {
  type: "RFQ_NUMBER",
  regex: /\bRFQ[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RFQ_{n}]",
  priority: 75,
  severity: "medium",
  description: "Request for quote numbers",
  validator: (_value, context) => {
    return /rfq|quote|quotation|request|procurement/i.test(context);
  }
};
var PROJECT_CODE = {
  type: "PROJECT_CODE",
  regex: /\b(?:PROJECT|PROJ)[-\s]+(?:CODE)?[-\s]?[:#]?\s*([A-Z0-9]{4,10})\b/gi,
  placeholder: "[PROJECT_{n}]",
  priority: 70,
  severity: "low",
  description: "Internal project codes",
  validator: (_value, context) => {
    return /project|proj|initiative|program|code\s*[:#]/i.test(context);
  }
};
var manufacturingPatterns = [
  SUPPLIER_ID$1,
  PART_NUMBER,
  PURCHASE_ORDER_NUMBER,
  WORK_ORDER_NUMBER,
  BATCH_LOT_NUMBER,
  MANUFACTURING_SERIAL,
  VENDOR_CODE,
  BOM_NUMBER,
  QC_CERTIFICATE_NUMBER,
  CONTAINER_NUMBER,
  PALLET_ID,
  ROUTING_NUMBER_MFG,
  RFQ_NUMBER$1,
  PROJECT_CODE
];
var VIN = {
  type: "VIN",
  regex: /\bVIN[-\s]?[:#]?\s*([A-HJ-NPR-Z0-9]{17})\b/gi,
  placeholder: "[VIN_{n}]",
  priority: 90,
  severity: "high",
  description: "Vehicle Identification Number",
  validator: (value) => {
    return value.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(value);
  }
};
var LICENSE_PLATE = {
  type: "LICENSE_PLATE",
  regex: /\b(?:LICENSE|PLATE|REG(?:ISTRATION)?)[-\s]?(?:NO|NUM(?:BER)?|PLATE)?[-\s]?[:#]?\s*([A-Z0-9]{2,8})\b/gi,
  placeholder: "[PLATE_{n}]",
  priority: 85,
  severity: "high",
  description: "Vehicle license plate numbers",
  validator: (_value, context) => {
    return /license|plate|registration|vehicle|car|auto/i.test(context);
  }
};
var FLEET_VEHICLE_ID = {
  type: "FLEET_VEHICLE_ID",
  regex: /\b(?:FLEET|VEHICLE)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[FLEET_{n}]",
  priority: 80,
  severity: "medium",
  description: "Fleet vehicle identification numbers",
  validator: (_value, context) => {
    return /fleet|vehicle|car|truck|van|unit/i.test(context);
  }
};
var TELEMATICS_DEVICE_ID = {
  type: "TELEMATICS_DEVICE_ID",
  regex: /\b(?:TELEMATICS|GPS[-\s]?DEVICE)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{10,16})\b/gi,
  placeholder: "[TELEMATICS_{n}]",
  priority: 80,
  severity: "medium",
  description: "Telematics and GPS device identifiers",
  validator: (_value, context) => {
    return /telematics|gps|tracking|device|monitor/i.test(context);
  }
};
var BOOKING_NUMBER = {
  type: "BOOKING_NUMBER",
  regex: /\b(?:BOOKING|RESERVATION|RES)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[BOOKING_{n}]",
  priority: 80,
  severity: "medium",
  description: "Transportation booking and reservation numbers",
  validator: (_value, context) => {
    return /booking|reservation|ticket|travel|flight|train|bus/i.test(context);
  }
};
var DRIVER_ID = {
  type: "DRIVER_ID",
  regex: /\bDRIVER[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[DRIVER_{n}]",
  priority: 85,
  severity: "high",
  description: "Driver identification numbers",
  validator: (_value, context) => {
    return /driver|operator|chauffeur/i.test(context);
  }
};
var SHIPMENT_TRACKING = {
  type: "SHIPMENT_TRACKING",
  regex: /\b(?:SHIPMENT|TRACKING)[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{10,30})\b/gi,
  placeholder: "[SHIPMENT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Shipment tracking numbers",
  validator: (_value, context) => {
    return /shipment|tracking|delivery|freight|cargo/i.test(context);
  }
};
var TOLL_TAG_ID = {
  type: "TOLL_TAG_ID",
  regex: /\b(?:TOLL[-\s]?TAG|E[-]?ZPASS|TRANSPONDER)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[TOLL_{n}]",
  priority: 80,
  severity: "medium",
  description: "Toll tag and transponder identifiers",
  validator: (_value, context) => {
    return /toll|tag|ezpass|transponder|fastrak/i.test(context);
  }
};
var INSPECTION_CERTIFICATE = {
  type: "INSPECTION_CERTIFICATE",
  regex: /\b(?:INSPECTION|INSP)[-\s]?(?:CERT(?:IFICATE)?)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[INSPECTION_{n}]",
  priority: 75,
  severity: "medium",
  description: "Vehicle inspection certificate numbers",
  validator: (_value, context) => {
    return /inspection|certificate|safety|emissions|test/i.test(context);
  }
};
var ODOMETER_READING_REF = {
  type: "ODOMETER_READING_REF",
  regex: /\b(?:ODOMETER|MILEAGE)[-\s]?[:#]?\s*(\d{1,7})\s*(?:KM|MILES|MI)\b/gi,
  placeholder: "[ODO_{n}]",
  priority: 70,
  severity: "low",
  description: "Odometer readings",
  validator: (_value, context) => {
    return /odometer|mileage|miles|km|reading/i.test(context);
  }
};
var VEHICLE_INSURANCE_POLICY = {
  type: "VEHICLE_INSURANCE_POLICY",
  regex: /\b(?:AUTO|VEHICLE|CAR)[-\s]?(?:INSURANCE)?[-\s]?(?:POLICY)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{2,4}\d{6,10})\b/gi,
  placeholder: "[AUTO_POLICY_{n}]",
  priority: 85,
  severity: "high",
  description: "Vehicle insurance policy numbers",
  validator: (_value, context) => {
    return /auto|vehicle|car|insurance|policy|coverage/i.test(context);
  }
};
var TRIP_ID = {
  type: "TRIP_ID",
  regex: /\b(?:TRIP|RIDE)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[TRIP_{n}]",
  priority: 80,
  severity: "medium",
  description: "Trip and ride identification numbers",
  validator: (_value, context) => {
    return /trip|ride|journey|fare|taxi|uber|lyft/i.test(context);
  }
};
var transportationPatterns = [
  VIN,
  LICENSE_PLATE,
  FLEET_VEHICLE_ID,
  TELEMATICS_DEVICE_ID,
  BOOKING_NUMBER,
  DRIVER_ID,
  SHIPMENT_TRACKING,
  TOLL_TAG_ID,
  INSPECTION_CERTIFICATE,
  ODOMETER_READING_REF,
  VEHICLE_INSURANCE_POLICY,
  TRIP_ID
];
var INTERVIEWEE_ID = {
  type: "INTERVIEWEE_ID",
  regex: /\bINTV[-\s]?([A-Z]{1}\d{5})\b/gi,
  placeholder: "[INTERVIEWEE_{n}]",
  priority: 85,
  severity: "high",
  description: "Interviewee identification numbers for anonymity"
};
var SOURCE_ID = {
  type: "SOURCE_ID",
  regex: /\bSOURCE[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[SOURCE_{n}]",
  priority: 90,
  severity: "high",
  description: "Confidential source identifiers",
  validator: (_value, context) => {
    return /source|informant|confidential|anonymous|whistleblower/i.test(context);
  }
};
var ARTICLE_ID = {
  type: "ARTICLE_ID",
  regex: /\b(?:ARTICLE|STORY)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ARTICLE_{n}]",
  priority: 70,
  severity: "low",
  description: "Article and story identification numbers",
  validator: (_value, context) => {
    return /article|story|piece|content|publication/i.test(context);
  }
};
var MANUSCRIPT_ID = {
  type: "MANUSCRIPT_ID",
  regex: /\b(?:MANUSCRIPT|MS)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[MANUSCRIPT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Manuscript identification numbers",
  validator: (_value, context) => {
    return /manuscript|ms|draft|submission|review/i.test(context);
  }
};
var PRESS_PASS_ID = {
  type: "PRESS_PASS_ID",
  regex: /\b(?:PRESS[-\s]?PASS|MEDIA[-\s]?CREDENTIAL)[-\s]?(?:ID|NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PRESS_{n}]",
  priority: 80,
  severity: "medium",
  description: "Press pass and media credential numbers",
  validator: (_value, context) => {
    return /press|media|credential|pass|journalist|reporter/i.test(context);
  }
};
var CONTRIBUTOR_ID = {
  type: "CONTRIBUTOR_ID",
  regex: /\b(?:CONTRIBUTOR|FREELANCER|WRITER)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[CONTRIBUTOR_{n}]",
  priority: 75,
  severity: "medium",
  description: "Contributor and freelancer identification numbers",
  validator: (_value, context) => {
    return /contributor|freelancer|writer|author|journalist/i.test(context);
  }
};
var PUBLISHING_CONTRACT = {
  type: "PUBLISHING_CONTRACT",
  regex: /\b(?:PUBLISHING|PUB)[-\s]?(?:CONTRACT)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[PUB_CONTRACT_{n}]",
  priority: 80,
  severity: "high",
  description: "Publishing contract numbers",
  validator: (_value, context) => {
    return /publishing|contract|agreement|deal|rights/i.test(context);
  }
};
var EDITORIAL_TICKET = {
  type: "EDITORIAL_TICKET",
  regex: /\b(?:EDITORIAL|EDIT)[-\s]?(?:TICKET|TASK)?[-\s]?(?:ID|NO)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[EDIT_{n}]",
  priority: 70,
  severity: "low",
  description: "Editorial ticket and task identifiers",
  validator: (_value, context) => {
    return /editorial|edit|task|ticket|assignment/i.test(context);
  }
};
var SUBSCRIBER_ID = {
  type: "SUBSCRIBER_ID",
  regex: /\bSUBSCRIBER[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[SUBSCRIBER_{n}]",
  priority: 85,
  severity: "high",
  description: "Subscriber identification numbers",
  validator: (_value, context) => {
    return /subscriber|subscription|member|account|reader/i.test(context);
  }
};
var ISBN = {
  type: "ISBN",
  regex: /\bISBN[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*(\d{3}[-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1})\b/gi,
  placeholder: "[ISBN_{n}]",
  priority: 65,
  severity: "low",
  description: "International Standard Book Numbers"
};
var COPYRIGHT_REG = {
  type: "COPYRIGHT_REG",
  regex: /\b(?:COPYRIGHT|©)[-\s]?(?:REG(?:ISTRATION)?)?[-\s]?(?:NO|NUM(?:BER)?)?[-\s]?[:#]?\s*([A-Z]{2,3}\d{6,10})\b/gi,
  placeholder: "[COPYRIGHT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Copyright registration numbers",
  validator: (_value, context) => {
    return /copyright|registration|intellectual|property|rights/i.test(context);
  }
};
var PRODUCTION_ID = {
  type: "PRODUCTION_ID",
  regex: /\b(?:PRODUCTION|PROD)[-\s]?(?:ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PRODUCTION_{n}]",
  priority: 70,
  severity: "low",
  description: "Film and video production identifiers",
  validator: (_value, context) => {
    return /production|film|video|shoot|project/i.test(context);
  }
};
var mediaPatterns = [
  INTERVIEWEE_ID,
  SOURCE_ID,
  ARTICLE_ID,
  MANUSCRIPT_ID,
  PRESS_PASS_ID,
  CONTRIBUTOR_ID,
  PUBLISHING_CONTRACT,
  EDITORIAL_TICKET,
  SUBSCRIBER_ID,
  ISBN,
  COPYRIGHT_REG,
  PRODUCTION_ID
];
var DONOR_ID = {
  type: "DONOR_ID",
  regex: /\b(?:DONOR|DON|D)[-_]?\d{6,10}\b/gi,
  placeholder: "[DONOR_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Charitable donor identification numbers",
  validator: (_value, context) => {
    return /donor|donation|charitable|contribution|gift|philanthrop/i.test(context);
  }
};
var DONATION_REFERENCE = {
  type: "DONATION_REFERENCE",
  regex: /\b(?:DONATION|DN|GIFT|CONTRIB)[-_]?\d{6,12}\b/gi,
  placeholder: "[DONATION_REF_{n}]",
  priority: 80,
  severity: "medium",
  description: "Donation and contribution reference numbers"
};
var UK_CHARITY_NUMBER = {
  type: "UK_CHARITY_NUMBER",
  regex: /\b(?:Charity\s+(?:No|Number|Registration|Reg)\.?\s*:?\s*)?(\d{6,7}(?:-\d)?)\b/gi,
  placeholder: "[UK_CHARITY_{n}]",
  priority: 75,
  severity: "low",
  description: "UK charity registration numbers",
  validator: (value, context) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 8 && /charity|charitable|commission/i.test(context);
  }
};
var US_EIN = {
  type: "US_EIN",
  regex: /\b(?:EIN|Tax\s+ID|Federal\s+Tax\s+ID)\.?\s*:?\s*(\d{2}-\d{7})\b/gi,
  placeholder: "[EIN_{n}]",
  priority: 90,
  severity: "high",
  description: "US Employer Identification Numbers (nonprofit tax IDs)",
  validator: (value, context) => {
    return value.replace(/\D/g, "").length === 9 && /nonprofit|charity|501\(c\)|tax[-\s]exempt|foundation/i.test(context);
  }
};
var GRANT_REFERENCE = {
  type: "GRANT_REFERENCE",
  regex: /\b(?:GRANT|GR|G)[-_]?\d{6,12}\b/gi,
  placeholder: "[GRANT_REF_{n}]",
  priority: 75,
  severity: "medium",
  description: "Grant and funding reference numbers",
  validator: (_value, context) => {
    return /grant|funding|award|endowment|foundation/i.test(context);
  }
};
var BENEFICIARY_ID = {
  type: "BENEFICIARY_ID",
  regex: /\b(?:BENEFICIARY|BENEF|BEN|B)[-_]?\d{6,10}\b/gi,
  placeholder: "[BENEFICIARY_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Charitable beneficiary identification numbers",
  validator: (_value, context) => {
    return /beneficiary|recipient|aid|assistance|service\s+user/i.test(context);
  }
};
var CAMPAIGN_CODE = {
  type: "CAMPAIGN_CODE",
  regex: /\b(?:CAMPAIGN|CAMP|FC)[-_]?[A-Z0-9]{4,12}\b/gi,
  placeholder: "[CAMPAIGN_{n}]",
  priority: 60,
  severity: "low",
  description: "Fundraising campaign reference codes"
};
var GIFT_AID_REFERENCE = {
  type: "GIFT_AID_REFERENCE",
  regex: /\b(?:GIFT\s*AID|GA)[-_]?\d{6,10}\b/gi,
  placeholder: "[GIFT_AID_{n}]",
  priority: 80,
  severity: "medium",
  description: "UK Gift Aid declaration reference numbers",
  validator: (_value, context) => {
    return /gift\s*aid|tax\s+relief|declaration/i.test(context);
  }
};
var VOLUNTEER_ID = {
  type: "VOLUNTEER_ID",
  regex: /\b(?:VOLUNTEER|VOL|V)[-_]?\d{6,10}\b/gi,
  placeholder: "[VOLUNTEER_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Volunteer identification numbers",
  validator: (_value, context) => {
    return /volunteer|volunteering|community\s+service/i.test(context);
  }
};
var MEMBERSHIP_NUMBER = {
  type: "MEMBERSHIP_NUMBER",
  regex: /\b(?:MEMBER(?:SHIP)?|MEM|M)[-_]?\d{6,10}\b/gi,
  placeholder: "[MEMBER_{n}]",
  priority: 70,
  severity: "medium",
  description: "Charity and association membership numbers",
  validator: (_value, context) => {
    return /member|membership|association|society|club/i.test(context);
  }
};
var LEGACY_REFERENCE = {
  type: "LEGACY_REFERENCE",
  regex: /\b(?:LEGACY|LEG|BEQUEST|BEQ)[-_]?\d{6,10}\b/gi,
  placeholder: "[LEGACY_{n}]",
  priority: 85,
  severity: "high",
  description: "Legacy and bequest reference numbers",
  validator: (_value, context) => {
    return /legacy|bequest|will|estate|inheritance|in\s+memory/i.test(context);
  }
};
var charitablePatterns = [
  DONOR_ID,
  DONATION_REFERENCE,
  UK_CHARITY_NUMBER,
  US_EIN,
  GRANT_REFERENCE,
  BENEFICIARY_ID,
  CAMPAIGN_CODE,
  GIFT_AID_REFERENCE,
  VOLUNTEER_ID,
  MEMBERSHIP_NUMBER,
  LEGACY_REFERENCE
];
var PURCHASE_ORDER = {
  type: "PURCHASE_ORDER",
  regex: /\b(?:PO|Purchase\s+Order)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[PO_{n}]",
  priority: 75,
  severity: "medium",
  description: "Purchase order numbers",
  validator: (_value, context) => {
    return /purchase|order|procurement|buying/i.test(context);
  }
};
var RFQ_NUMBER = {
  type: "RFQ_NUMBER",
  regex: /\b(?:RFQ|Request\s+for\s+Quotation)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[RFQ_{n}]",
  priority: 70,
  severity: "medium",
  description: "Request for Quotation reference numbers"
};
var RFP_NUMBER = {
  type: "RFP_NUMBER",
  regex: /\b(?:RFP|Request\s+for\s+Proposal)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[RFP_{n}]",
  priority: 70,
  severity: "medium",
  description: "Request for Proposal reference numbers"
};
var TENDER_REFERENCE = {
  type: "TENDER_REFERENCE",
  regex: /\b(?:TENDER|TN|T)[-_]?\d{6,12}\b/gi,
  placeholder: "[TENDER_{n}]",
  priority: 75,
  severity: "medium",
  description: "Tender and bidding reference numbers",
  validator: (_value, context) => {
    return /tender|bid|bidding|procurement|competition/i.test(context);
  }
};
var SUPPLIER_ID = {
  type: "SUPPLIER_ID",
  regex: /\b(?:SUPPLIER|SUP|VENDOR|VEN)[-_]?\d{6,10}\b/gi,
  placeholder: "[SUPPLIER_ID_{n}]",
  priority: 70,
  severity: "medium",
  description: "Supplier and vendor identification numbers",
  validator: (_value, context) => {
    return /supplier|vendor|provider|contractor/i.test(context);
  }
};
var CONTRACT_REFERENCE = {
  type: "CONTRACT_REFERENCE",
  regex: /\b(?:CONTRACT|CON|C)[-_]?\d{6,12}\b/gi,
  placeholder: "[CONTRACT_{n}]",
  priority: 80,
  severity: "medium",
  description: "Procurement contract reference numbers",
  validator: (_value, context) => {
    return /contract|agreement|procurement|supply/i.test(context);
  }
};
var REQUISITION_NUMBER = {
  type: "REQUISITION_NUMBER",
  regex: /\b(?:REQ|REQUISITION|PR|Purchase\s+Requisition)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[REQ_{n}]",
  priority: 70,
  severity: "medium",
  description: "Purchase requisition numbers"
};
var PCARD_REFERENCE = {
  type: "PCARD_REFERENCE",
  regex: /\b(?:P[-\s]?Card|Procurement\s+Card).*?(?:ending|last\s+4|XXXX)[-\s]?(\d{4})\b/gi,
  placeholder: "[PCARD_{n}]",
  priority: 90,
  severity: "high",
  description: "Procurement card references (partial numbers)"
};
var CATALOG_NUMBER = {
  type: "CATALOG_NUMBER",
  regex: /\b(?:CATALOG|CAT|PART|PN)[-#]?[A-Z0-9]{6,15}\b/gi,
  placeholder: "[CATALOG_{n}]",
  priority: 60,
  severity: "low",
  description: "Catalog and part numbers",
  validator: (_value, context) => {
    return /catalog|part|sku|item|product/i.test(context);
  }
};
var QUOTATION_REFERENCE = {
  type: "QUOTATION_REFERENCE",
  regex: /\b(?:QUOTATION|QUOTE|QUO|Q)[-_]?\d{6,12}\b/gi,
  placeholder: "[QUOTE_{n}]",
  priority: 70,
  severity: "medium",
  description: "Quotation reference numbers",
  validator: (_value, context) => {
    return /quot|price|estimate|proposal/i.test(context);
  }
};
var GOODS_RECEIPT = {
  type: "GOODS_RECEIPT",
  regex: /\b(?:GRN|Goods\s+Receipt)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[GRN_{n}]",
  priority: 65,
  severity: "low",
  description: "Goods receipt note numbers"
};
var FRAMEWORK_AGREEMENT = {
  type: "FRAMEWORK_AGREEMENT",
  regex: /\b(?:FRAMEWORK|FWK|FA)[-_]?\d{6,12}\b/gi,
  placeholder: "[FRAMEWORK_{n}]",
  priority: 75,
  severity: "medium",
  description: "Framework agreement reference numbers",
  validator: (_value, context) => {
    return /framework|agreement|procurement/i.test(context);
  }
};
var BLANKET_ORDER = {
  type: "BLANKET_ORDER",
  regex: /\b(?:BLANKET|BO|Blanket\s+Order)[-#\s]?(\d{6,12})\b/gi,
  placeholder: "[BLANKET_ORDER_{n}]",
  priority: 70,
  severity: "medium",
  description: "Blanket purchase order numbers"
};
var procurementPatterns = [
  PURCHASE_ORDER,
  RFQ_NUMBER,
  RFP_NUMBER,
  TENDER_REFERENCE,
  SUPPLIER_ID,
  CONTRACT_REFERENCE,
  REQUISITION_NUMBER,
  PCARD_REFERENCE,
  CATALOG_NUMBER,
  QUOTATION_REFERENCE,
  GOODS_RECEIPT,
  FRAMEWORK_AGREEMENT,
  BLANKET_ORDER
];
var EMERGENCY_CALL_REF = {
  type: "EMERGENCY_CALL_REF",
  regex: /\b(?:EMERGENCY|INCIDENT|CALL|CAD|DISPATCH|EVENT)[-\s]?(?:REF|NO|NUM|NUMBER|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[EMERGENCY_REF_{n}]",
  priority: 95,
  severity: "high",
  description: "Emergency services call reference numbers",
  validator: (_value, context) => {
    return /emergency|911|999|112|ambulance|fire|police|dispatch|incident|call[- ]?center/i.test(context);
  }
};
var POLICE_REPORT_NUMBER = {
  type: "POLICE_REPORT_NUMBER",
  regex: /\b(?:POLICE|PR|RPT|REPORT|CASE)[-\s\u00A0]*(?:NO|NUM|NUMBER|ID)?[-\s\u00A0.:#]*((?:[A-Z]{2,4}[\s\u00A0./-]?\d{2,4}[\s\u00A0./-]?\d{4,10})|\d{4}[\s\u00A0./-]?\d{5,10})\b/gi,
  placeholder: "[POLICE_RPT_{n}]",
  priority: 95,
  severity: "high",
  description: "Police report and case numbers",
  validator: (_value, context) => {
    return /police|officer|citation|arrest|detective|sheriff|trooper|constable|case[- ]?number/i.test(context);
  }
};
var FIRE_INCIDENT_NUMBER = {
  type: "FIRE_INCIDENT_NUMBER",
  regex: /\b(?:FIRE|FI|FD)[-\s\u00A0]*(?:INCIDENT|INC|NO|NUM|NUMBER|ID)?[-\s\u00A0.:#]*((?:[A-Z]{2,4}[\s\u00A0./-]?\d{2,4}[\s\u00A0./-]?\d{4,10})|\d{4}[\s\u00A0./-]?\d{4,8})\b/gi,
  placeholder: "[FIRE_INC_{n}]",
  priority: 95,
  severity: "high",
  description: "Fire department incident numbers",
  validator: (_value, context) => {
    return /fire|firefighter|dept|department|incident|response|station|alarm/i.test(context);
  }
};
var AMBULANCE_CALL_ID = {
  type: "AMBULANCE_CALL_ID",
  regex: /\b(?:AMBULANCE|AMB|EMS|PARAMEDIC)[-\s]?(?:CALL|ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[AMB_CALL_{n}]",
  priority: 90,
  severity: "high",
  description: "Ambulance and EMS call identifiers",
  validator: (_value, context) => {
    return /ambulance|ems|paramedic|emergency[- ]?medical|transport|patient[- ]?care/i.test(context);
  }
};
var PARAMEDIC_CERTIFICATION = {
  type: "PARAMEDIC_CERTIFICATION",
  regex: /\b(?:NREMT|EMT|PARAMEDIC)[-\s]?(?:P|B|A|I)?[-\s]?(?:CERT|LICENSE|LIC)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PARAMEDIC_CERT_{n}]",
  priority: 85,
  severity: "medium",
  description: "Paramedic and EMT certification numbers",
  validator: (_value, context) => {
    return /paramedic|emt|nremt|emergency[- ]?medical[- ]?tech|certification|license|certified|medic/i.test(context);
  }
};
var EMERGENCY_SHELTER_ID = {
  type: "EMERGENCY_SHELTER_ID",
  regex: /\b(?:SHELTER|EVACUATION|REFUGE)[-\s]?(?:REG|ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{5,12})\b/gi,
  placeholder: "[SHELTER_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Emergency shelter registration identifiers",
  validator: (_value, context) => {
    return /shelter|evacuation|refuge|displaced|disaster|emergency[- ]?housing/i.test(context);
  }
};
var DISASTER_VICTIM_ID = {
  type: "DISASTER_VICTIM_ID",
  regex: /\b(?:DVI|VICTIM)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*(\d{4}[-\s]?\d{4,8})\b/gi,
  placeholder: "[DVI_{n}]",
  priority: 95,
  severity: "high",
  description: "Disaster victim identification numbers",
  validator: (_value, context) => {
    return /disaster|victim|dvi|casualty|identification|mass[- ]?casualty|morgue/i.test(context);
  }
};
var SEARCH_RESCUE_MISSION_ID = {
  type: "SEARCH_RESCUE_MISSION_ID",
  regex: /\b(?:SAR|SEARCH|RESCUE|MISSION)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[SAR_MISSION_{n}]",
  priority: 90,
  severity: "high",
  description: "Search and rescue mission identifiers",
  validator: (_value, context) => {
    return /search|rescue|sar|mission|lost|missing|coast[- ]?guard/i.test(context);
  }
};
var EMERGENCY_MEDICAL_INCIDENT = {
  type: "EMERGENCY_MEDICAL_INCIDENT",
  regex: /\b(?:MEDICAL|MED|MI)[-\s]?(?:INCIDENT|INC|EMERGENCY|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[MED_INC_{n}]",
  priority: 90,
  severity: "high",
  description: "Emergency medical incident numbers",
  validator: (_value, context) => {
    return /medical|emergency|incident|patient|treatment|hospital|trauma/i.test(context);
  }
};
var FIREFIGHTER_BADGE = {
  type: "FIREFIGHTER_BADGE",
  regex: /\b(?:BADGE|FF|FIREFIGHTER)[-\s]?(?:NO|NUM|NUMBER|ID)?[-\s]?[:#]?\s*(\d{3,6})\b/gi,
  placeholder: "[FF_BADGE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Firefighter badge numbers",
  validator: (_value, context) => {
    return /firefighter|fire[- ]?dept|badge|ff|station|apparatus/i.test(context);
  }
};
var POLICE_BADGE = {
  type: "POLICE_BADGE",
  regex: /\b(?:BADGE|SHIELD|OFFICER)[-\s]?(?:NO|NUM|NUMBER|ID)?[-\s]?[:#]?\s*(\d{3,6})\b/gi,
  placeholder: "[POLICE_BADGE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Police officer badge numbers",
  validator: (_value, context) => {
    return /police|officer|badge|shield|dept|department|patrol/i.test(context);
  }
};
var MISSING_PERSON_CASE = {
  type: "MISSING_PERSON_CASE",
  regex: /\b(?:MISSING|MP|AMBER)[-\s]?(?:PERSON|CASE|ALERT)?[-\s]?(?:NO|NUMBER|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[MISSING_CASE_{n}]",
  priority: 95,
  severity: "high",
  description: "Missing person case numbers",
  validator: (_value, context) => {
    return /missing|amber|alert|person|child|endangered|located|found/i.test(context);
  }
};
var DISPATCHER_ID = {
  type: "DISPATCHER_ID",
  regex: /\b(?:DISPATCHER|DISP)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{3,8})\b/gi,
  placeholder: "[DISPATCHER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Emergency dispatcher identification numbers",
  validator: (_value, context) => {
    return /dispatcher|911|999|112|emergency|operator|call[- ]?center/i.test(context);
  }
};
var HAZMAT_INCIDENT = {
  type: "HAZMAT_INCIDENT",
  regex: /\b(?:HAZMAT|HM)[-\s]?(?:INCIDENT|INC|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[HAZMAT_{n}]",
  priority: 90,
  severity: "high",
  description: "Hazardous materials incident numbers",
  validator: (_value, context) => {
    return /hazmat|hazardous|material|chemical|spill|containment|decontamination/i.test(context);
  }
};
var emergencyServicesPatterns = [
  EMERGENCY_CALL_REF,
  POLICE_REPORT_NUMBER,
  FIRE_INCIDENT_NUMBER,
  AMBULANCE_CALL_ID,
  PARAMEDIC_CERTIFICATION,
  EMERGENCY_SHELTER_ID,
  DISASTER_VICTIM_ID,
  SEARCH_RESCUE_MISSION_ID,
  EMERGENCY_MEDICAL_INCIDENT,
  FIREFIGHTER_BADGE,
  POLICE_BADGE,
  MISSING_PERSON_CASE,
  DISPATCHER_ID,
  HAZMAT_INCIDENT
];
var PROPERTY_PARCEL_NUMBER = {
  type: "PROPERTY_PARCEL_NUMBER",
  regex: /\b(?:APN|PARCEL|ASSESSOR)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{3}[-\s]?\d{3}[-\s]?\d{3}(?:[-\s]?\d{1,3})?)\b/gi,
  placeholder: "[APN_{n}]",
  priority: 85,
  severity: "high",
  description: "Property assessor parcel numbers",
  validator: (_value, context) => {
    return /property|parcel|assessor|land|real[- ]?estate|apn|tax|deed/i.test(context);
  }
};
var MLS_LISTING_NUMBER = {
  type: "MLS_LISTING_NUMBER",
  regex: /\bMLS[-\s]?(?:NO|NUM|NUMBER|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[MLS_{n}]",
  priority: 80,
  severity: "medium",
  description: "MLS (Multiple Listing Service) property listing numbers",
  validator: (_value, context) => {
    return /mls|listing|real[- ]?estate|property|broker|agent|sale|for[- ]sale/i.test(context);
  }
};
var MORTGAGE_LOAN_NUMBER = {
  type: "MORTGAGE_LOAN_NUMBER",
  regex: /\b(?:MORTGAGE|LOAN|MTG)[-\s]?(?:NO|NUM|NUMBER|ID|ACCOUNT)?[-\s]?[:#]?\s*([A-Z0-9]{8,14})\b/gi,
  placeholder: "[MORTGAGE_{n}]",
  priority: 90,
  severity: "high",
  description: "Mortgage and home loan account numbers",
  validator: (_value, context) => {
    return /mortgage|loan|lender|lending|home[- ]?loan|refinance|foreclosure|escrow/i.test(context);
  }
};
var PROPERTY_TAX_ACCOUNT = {
  type: "PROPERTY_TAX_ACCOUNT",
  regex: /\b(?:PROPERTY[- ]?TAX|TAX|MUNICIPAL)[-\s]?(?:ACCOUNT|ACCT|NO|NUMBER|ID)?[-\s]?[:#]?\s*(\d{6,12})\b/gi,
  placeholder: "[TAX_ACCT_{n}]",
  priority: 85,
  severity: "high",
  description: "Property tax account numbers",
  validator: (_value, context) => {
    return /property[- ]?tax|municipal|county|city|tax[- ]?bill|assessment|levy/i.test(context);
  }
};
var HOA_ACCOUNT_NUMBER = {
  type: "HOA_ACCOUNT_NUMBER",
  regex: /\bHOA[-\s]?(?:ACCOUNT|ACCT|NO|NUMBER|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[HOA_{n}]",
  priority: 80,
  severity: "medium",
  description: "HOA (Homeowners Association) account numbers",
  validator: (_value, context) => {
    return /hoa|homeowners|association|condo|dues|fee|community/i.test(context);
  }
};
var TITLE_DEED_NUMBER = {
  type: "TITLE_DEED_NUMBER",
  regex: /\b(?:TITLE|DEED)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[DEED_{n}]",
  priority: 85,
  severity: "high",
  description: "Property title and deed numbers",
  validator: (_value, context) => {
    return /title|deed|recording|recorder|registry|land[- ]?registry|conveyance/i.test(context);
  }
};
var REAL_ESTATE_LICENSE = {
  type: "REAL_ESTATE_LICENSE",
  regex: /\b(?:REAL[- ]?ESTATE|RE|BROKER)[-\s]?(?:LICENSE|LIC)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RE_LIC_{n}]",
  priority: 80,
  severity: "medium",
  description: "Real estate agent/broker license numbers",
  validator: (_value, context) => {
    return /real[- ]?estate|broker|agent|license|realtor|certified/i.test(context);
  }
};
var APPRAISAL_REFERENCE = {
  type: "APPRAISAL_REFERENCE",
  regex: /\b(?:APPRAISAL|APPR)[-\s]?(?:NO|NUM|NUMBER|REF|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[APPR_{n}]",
  priority: 75,
  severity: "medium",
  description: "Property appraisal reference numbers",
  validator: (_value, context) => {
    return /appraisal|appraiser|valuation|value|assessment|market[- ]?value/i.test(context);
  }
};
var ESCROW_NUMBER = {
  type: "ESCROW_NUMBER",
  regex: /\bESCROW[-\s]?(?:NO|NUM|NUMBER|ACCOUNT|ACCT|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[ESCROW_{n}]",
  priority: 85,
  severity: "high",
  description: "Escrow account numbers",
  validator: (_value, context) => {
    return /escrow|closing|settlement|title[- ]?company|transaction/i.test(context);
  }
};
var LEASE_AGREEMENT_NUMBER = {
  type: "LEASE_AGREEMENT_NUMBER",
  regex: /\b(?:LEASE|RENTAL)[-\s]?(?:AGREEMENT|CONTRACT|NO|NUM|NUMBER|ID)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[LEASE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Lease and rental agreement numbers",
  validator: (_value, context) => {
    return /lease|rental|tenant|landlord|rent|renter|apartment|unit/i.test(context);
  }
};
var realEstatePatterns = [
  PROPERTY_PARCEL_NUMBER,
  MLS_LISTING_NUMBER,
  MORTGAGE_LOAN_NUMBER,
  PROPERTY_TAX_ACCOUNT,
  HOA_ACCOUNT_NUMBER,
  TITLE_DEED_NUMBER,
  REAL_ESTATE_LICENSE,
  APPRAISAL_REFERENCE,
  ESCROW_NUMBER,
  LEASE_AGREEMENT_NUMBER
];
var UBER_TRIP_ID = {
  type: "UBER_TRIP_ID",
  regex: /\bUBER[-\s]?(?:TRIP|RIDE)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,24})\b/gi,
  placeholder: "[UBER_TRIP_{n}]",
  priority: 85,
  severity: "medium",
  description: "Uber trip/ride identifier",
  validator: (_value, context) => {
    return /uber|rideshare|ride|trip|driver|passenger/i.test(context);
  }
};
var LYFT_RIDE_ID = {
  type: "LYFT_RIDE_ID",
  regex: /\bLYFT[-\s]?(?:RIDE|TRIP)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,24})\b/gi,
  placeholder: "[LYFT_RIDE_{n}]",
  priority: 85,
  severity: "medium",
  description: "Lyft ride identifier",
  validator: (_value, context) => {
    return /lyft|rideshare|ride|trip|driver|passenger/i.test(context);
  }
};
var DOORDASH_ORDER_ID = {
  type: "DOORDASH_ORDER_ID",
  regex: /\b(?:DOORDASH|DD)[-\s]?(?:ORDER|DELIVERY)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[DD_ORDER_{n}]",
  priority: 80,
  severity: "medium",
  description: "DoorDash order identifier",
  validator: (_value, context) => {
    return /doordash|dasher|delivery|order|food[- ]?delivery/i.test(context);
  }
};
var UBEREATS_ORDER_ID = {
  type: "UBEREATS_ORDER_ID",
  regex: /\bUBER[-\s]?EATS[-\s]?(?:ORDER|DELIVERY)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[UE_ORDER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Uber Eats order identifier",
  validator: (_value, context) => {
    return /uber[- ]?eats|delivery|order|food[- ]?delivery/i.test(context);
  }
};
var GRUBHUB_ORDER_ID = {
  type: "GRUBHUB_ORDER_ID",
  regex: /\bGRUBHUB[-\s]?(?:ORDER)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[GH_ORDER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Grubhub order identifier",
  validator: (_value, context) => {
    return /grubhub|delivery|order|food[- ]?delivery|restaurant/i.test(context);
  }
};
var AIRBNB_RESERVATION_ID = {
  type: "AIRBNB_RESERVATION_ID",
  regex: /\bAIRBNB[-\s]?(?:RESERVATION|BOOKING|CONF(?:IRMATION)?)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{9,16})\b/gi,
  placeholder: "[AIRBNB_RES_{n}]",
  priority: 85,
  severity: "medium",
  description: "Airbnb reservation/booking identifier",
  validator: (_value, context) => {
    return /airbnb|reservation|booking|host|guest|stay|accommodation/i.test(context);
  }
};
var INSTACART_ORDER_ID = {
  type: "INSTACART_ORDER_ID",
  regex: /\bINSTACART[-\s]?(?:ORDER|DELIVERY)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[IC_ORDER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Instacart order identifier",
  validator: (_value, context) => {
    return /instacart|shopper|grocery|delivery|order/i.test(context);
  }
};
var TASKRABBIT_TASK_ID = {
  type: "TASKRABBIT_TASK_ID",
  regex: /\b(?:TASKRABBIT|TR)[-\s]?(?:TASK|JOB)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[TR_TASK_{n}]",
  priority: 75,
  severity: "medium",
  description: "TaskRabbit task identifier",
  validator: (_value, context) => {
    return /taskrabbit|tasker|task|job|service|handyman/i.test(context);
  }
};
var UPWORK_JOB_ID = {
  type: "UPWORK_JOB_ID",
  regex: /\bUPWORK[-\s]?(?:JOB|CONTRACT|PROJECT)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[UW_JOB_{n}]",
  priority: 80,
  severity: "medium",
  description: "Upwork job/contract identifier",
  validator: (_value, context) => {
    return /upwork|freelance|contract|job|project|client|proposal/i.test(context);
  }
};
var FIVERR_ORDER_ID = {
  type: "FIVERR_ORDER_ID",
  regex: /\bFIVERR[-\s]?(?:ORDER|GIG)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[FV_ORDER_{n}]",
  priority: 75,
  severity: "medium",
  description: "Fiverr order/gig identifier",
  validator: (_value, context) => {
    return /fiverr|seller|buyer|gig|order|freelance/i.test(context);
  }
};
var POSTMATES_DELIVERY_ID = {
  type: "POSTMATES_DELIVERY_ID",
  regex: /\bPOSTMATES[-\s]?(?:DELIVERY|ORDER)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[PM_DEL_{n}]",
  priority: 75,
  severity: "medium",
  description: "Postmates delivery identifier",
  validator: (_value, context) => {
    return /postmates|delivery|order|courier|food/i.test(context);
  }
};
var GIG_PLATFORM_USER_ID = {
  type: "GIG_PLATFORM_USER_ID",
  regex: /\b(?:DRIVER|DASHER|SHOPPER|TASKER|COURIER|RIDER)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,16})\b/gi,
  placeholder: "[GIG_USER_{n}]",
  priority: 70,
  severity: "medium",
  description: "Gig economy platform user identifier",
  validator: (_value, context) => {
    return /driver|dasher|shopper|tasker|courier|rider|delivery|gig[- ]?economy|platform/i.test(context);
  }
};
var GIG_PLATFORM_ORDER_ID = {
  type: "GIG_PLATFORM_ORDER_ID",
  regex: /\b(?:ORDER|TRIP|DELIVERY|BOOKING)[-\s]?[:#]\s*([A-Z0-9]{8,20})\b/gi,
  placeholder: "[GIG_ORDER_{n}]",
  priority: 65,
  severity: "medium",
  description: "Generic gig platform order/trip identifier",
  validator: (value, context) => {
    const hasGigContext = /uber|lyft|doordash|airbnb|instacart|taskrabbit|postmates|grubhub|delivery|rideshare/i.test(context);
    const hasOrderContext = /order|trip|delivery|booking|ride|reservation/i.test(context);
    return hasGigContext && hasOrderContext && value.length >= 8;
  }
};
var gigEconomyPatterns = [
  UBER_TRIP_ID,
  LYFT_RIDE_ID,
  DOORDASH_ORDER_ID,
  UBEREATS_ORDER_ID,
  GRUBHUB_ORDER_ID,
  AIRBNB_RESERVATION_ID,
  INSTACART_ORDER_ID,
  TASKRABBIT_TASK_ID,
  UPWORK_JOB_ID,
  FIVERR_ORDER_ID,
  POSTMATES_DELIVERY_ID,
  GIG_PLATFORM_USER_ID,
  GIG_PLATFORM_ORDER_ID
];
var AIRLINE_PNR = {
  type: "AIRLINE_PNR",
  regex: /\b(?:PNR|BOOKING|CONFIRMATION)[-\s]?(?:NO|NUM|NUMBER|CODE)?[-\s]?[:#]?\s*([A-Z0-9]{6})\b/gi,
  placeholder: "[PNR_{n}]",
  priority: 85,
  severity: "medium",
  description: "Airline Passenger Name Record (PNR)",
  validator: (value, context) => {
    if (value.length !== 6) return false;
    return /airline|flight|booking|reservation|pnr|travel|passenger|ticket/i.test(context);
  }
};
var HOTEL_RESERVATION = {
  type: "HOTEL_RESERVATION",
  regex: /\b(?:HOTEL|RESERVATION|CONF(?:IRMATION)?|BOOKING)[-\s]?(?:NO|NUM|NUMBER|CODE)?[-\s]?[:#]?\s*([A-Z0-9]{6,14})\b/gi,
  placeholder: "[HOTEL_RES_{n}]",
  priority: 80,
  severity: "medium",
  description: "Hotel reservation/confirmation number",
  validator: (_value, context) => {
    return /hotel|reservation|booking|room|accommodation|stay|check[-\s]?in|lodging/i.test(context);
  }
};
var FREQUENT_FLYER_NUMBER = {
  type: "FREQUENT_FLYER_NUMBER",
  regex: /\b(?:FREQUENT[- ]?FLYER|FF|MILEAGE|LOYALTY)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[FF_NUM_{n}]",
  priority: 75,
  severity: "medium",
  description: "Frequent flyer/loyalty program number",
  validator: (_value, context) => {
    return /frequent[- ]?flyer|miles|mileage|loyalty|rewards|member|airline/i.test(context);
  }
};
var HOTEL_LOYALTY_NUMBER = {
  type: "HOTEL_LOYALTY_NUMBER",
  regex: /\b(?:MEMBER|LOYALTY|REWARDS)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[HOTEL_LOYALTY_{n}]",
  priority: 75,
  severity: "medium",
  description: "Hotel loyalty/rewards program number",
  validator: (_value, context) => {
    return /hotel|marriott|hilton|hyatt|ihg|loyalty|rewards|points|member/i.test(context);
  }
};
var CRUISE_BOOKING_NUMBER = {
  type: "CRUISE_BOOKING_NUMBER",
  regex: /\b(?:CRUISE|BOOKING|RESERVATION)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[CRUISE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Cruise line booking number",
  validator: (_value, context) => {
    return /cruise|ship|sailing|voyage|cabin|carnival|royal[- ]?caribbean|norwegian/i.test(context);
  }
};
var TRAVEL_AGENCY_BOOKING = {
  type: "TRAVEL_AGENCY_BOOKING",
  regex: /\b(?:TRAVEL|AGENCY|BOOKING|TRIP)[-\s]?(?:REF|REFERENCE|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TRAVEL_REF_{n}]",
  priority: 70,
  severity: "medium",
  description: "Travel agency booking reference",
  validator: (_value, context) => {
    return /travel[- ]?agency|tour|package|itinerary|booking|vacation/i.test(context);
  }
};
var RENTAL_CAR_CONFIRMATION = {
  type: "RENTAL_CAR_CONFIRMATION",
  regex: /\b(?:RENTAL|CAR|VEHICLE)[-\s]?(?:CONF(?:IRMATION)?|RESERVATION|BOOKING)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[CAR_RENTAL_{n}]",
  priority: 75,
  severity: "medium",
  description: "Rental car confirmation number",
  validator: (_value, context) => {
    return /rental|car|vehicle|hertz|enterprise|avis|budget|rent/i.test(context);
  }
};
var THEME_PARK_TICKET = {
  type: "THEME_PARK_TICKET",
  regex: /\b(?:TICKET|PASS|ADMISSION)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[TICKET_{n}]",
  priority: 70,
  severity: "low",
  description: "Theme park or attraction ticket number",
  validator: (value, context) => {
    if (value.length < 8) return false;
    return /theme[- ]?park|disney|universal|attraction|admission|ticket|pass|entry/i.test(context);
  }
};
var TSA_PRECHECK_NUMBER = {
  type: "TSA_PRECHECK_NUMBER",
  regex: /\b(?:TSA|PRECHECK|KTN|KNOWN[- ]?TRAVELER)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{9,10})\b/gi,
  placeholder: "[TSA_{n}]",
  priority: 85,
  severity: "medium",
  description: "TSA PreCheck / Known Traveler Number",
  validator: (value, context) => {
    const length = value.length;
    if (length < 9 || length > 10) return false;
    return /tsa|precheck|pre[- ]?check|ktn|known[- ]?traveler|security|screening/i.test(context);
  }
};
var GLOBAL_ENTRY_NUMBER = {
  type: "GLOBAL_ENTRY_NUMBER",
  regex: /\b(?:GLOBAL[- ]?ENTRY|PASS[- ]?ID)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{9})\b/gi,
  placeholder: "[GLOBAL_ENTRY_{n}]",
  priority: 85,
  severity: "medium",
  description: "Global Entry / PASS ID number",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    return /global[- ]?entry|pass[- ]?id|customs|immigration|cbp|trusted[- ]?traveler/i.test(context);
  }
};
var hospitalityPatterns = [
  AIRLINE_PNR,
  HOTEL_RESERVATION,
  FREQUENT_FLYER_NUMBER,
  HOTEL_LOYALTY_NUMBER,
  CRUISE_BOOKING_NUMBER,
  TRAVEL_AGENCY_BOOKING,
  RENTAL_CAR_CONFIRMATION,
  THEME_PARK_TICKET,
  TSA_PRECHECK_NUMBER,
  GLOBAL_ENTRY_NUMBER
];
var PMP_CERTIFICATION = {
  type: "PMP_CERTIFICATION",
  regex: /\bPMP[-\s]?(?:ID|NO|NUM|NUMBER|CERT(?:IFICATION)?)?[-\s]?[:#]?\s*(\d{7,9})\b/gi,
  placeholder: "[PMP_{n}]",
  priority: 80,
  severity: "medium",
  description: "PMP (Project Management Professional) certification number",
  validator: (value, context) => {
    const length = value.length;
    if (length < 7 || length > 9) return false;
    return /pmp|project[- ]?management|pmi|certification|certified/i.test(context);
  }
};
var CPA_LICENSE = {
  type: "CPA_LICENSE",
  regex: /\bCPA[-\s]?(?:LICENSE|LIC|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{5,10})\b/gi,
  placeholder: "[CPA_{n}]",
  priority: 85,
  severity: "medium",
  description: "CPA (Certified Public Accountant) license number",
  validator: (_value, context) => {
    return /cpa|certified[- ]?public[- ]?accountant|accountancy|license|accounting/i.test(context);
  }
};
var PE_LICENSE = {
  type: "PE_LICENSE",
  regex: /\bPE[-\s]?(?:LICENSE|LIC|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{5,10})\b/gi,
  placeholder: "[PE_{n}]",
  priority: 80,
  severity: "medium",
  description: "PE (Professional Engineer) license number",
  validator: (_value, context) => {
    return /professional[- ]?engineer|engineering|pe[- ]?license|registered[- ]?engineer/i.test(context);
  }
};
var NURSING_LICENSE = {
  type: "NURSING_LICENSE",
  regex: /\b(?:RN|LPN|NP|NURSING)[-\s]?(?:LICENSE|LIC|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[RN_{n}]",
  priority: 85,
  severity: "high",
  description: "Nursing license number (RN, LPN, NP)",
  validator: (_value, context) => {
    return /nurse|nursing|rn|lpn|registered[- ]?nurse|license|practitioner/i.test(context);
  }
};
var TEACHING_LICENSE = {
  type: "TEACHING_LICENSE",
  regex: /\b(?:TEACHING|TEACHER|EDUCATOR)[-\s]?(?:LICENSE|LIC|CERT(?:IFICATE)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TEACHER_{n}]",
  priority: 80,
  severity: "medium",
  description: "Teaching certificate/license number",
  validator: (_value, context) => {
    return /teacher|teaching|educator|education|certificate|license|certified/i.test(context);
  }
};
var AWS_CERTIFICATION = {
  type: "AWS_CERTIFICATION",
  regex: /\bAWS[-\s]?(?:CERT(?:IFICATION)?|ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[AWS_CERT_{n}]",
  priority: 75,
  severity: "low",
  description: "AWS (Amazon Web Services) certification ID",
  validator: (_value, context) => {
    return /aws|amazon[- ]?web[- ]?services|cloud|certification|certified|solutions[- ]?architect/i.test(context);
  }
};
var MICROSOFT_CERTIFICATION = {
  type: "MICROSOFT_CERTIFICATION",
  regex: /\b(?:MICROSOFT|MCID|MS)[-\s]?(?:CERT(?:IFICATION)?|ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[MS_CERT_{n}]",
  priority: 75,
  severity: "low",
  description: "Microsoft certification ID (MCID)",
  validator: (_value, context) => {
    return /microsoft|mcid|azure|certification|certified|mcsa|mcse/i.test(context);
  }
};
var CISCO_CERTIFICATION = {
  type: "CISCO_CERTIFICATION",
  regex: /\b(?:CISCO|CSCO)[-\s]?(?:CERT(?:IFICATION)?|ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[CISCO_CERT_{n}]",
  priority: 75,
  severity: "low",
  description: "Cisco certification ID",
  validator: (_value, context) => {
    return /cisco|ccna|ccnp|ccie|networking|certification|certified/i.test(context);
  }
};
var COMPTIA_CERTIFICATION = {
  type: "COMPTIA_CERTIFICATION",
  regex: /\bCOMPTIA[-\s]?(?:CERT(?:IFICATION)?|ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{8,16})\b/gi,
  placeholder: "[COMPTIA_{n}]",
  priority: 75,
  severity: "low",
  description: "CompTIA certification ID",
  validator: (_value, context) => {
    return /comptia|a\+|security\+|network\+|certification|certified/i.test(context);
  }
};
var FINRA_LICENSE = {
  type: "FINRA_LICENSE",
  regex: /\b(?:CRD|SERIES|FINRA)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{6,8})\b/gi,
  placeholder: "[FINRA_{n}]",
  priority: 85,
  severity: "high",
  description: "FINRA license number (CRD, Series licenses)",
  validator: (value, context) => {
    const length = value.length;
    if (length < 6 || length > 8) return false;
    return /finra|crd|series|broker|dealer|securities|license|registered/i.test(context);
  }
};
var professionalCertificationPatterns = [
  PMP_CERTIFICATION,
  CPA_LICENSE,
  PE_LICENSE,
  NURSING_LICENSE,
  TEACHING_LICENSE,
  AWS_CERTIFICATION,
  MICROSOFT_CERTIFICATION,
  CISCO_CERTIFICATION,
  COMPTIA_CERTIFICATION,
  FINRA_LICENSE
];
var RIOT_ID = {
  type: "RIOT_ID",
  regex: /\b([a-zA-Z0-9_]{3,16})#([a-zA-Z0-9]{3,5})\b/g,
  placeholder: "[RIOT_ID_{n}]",
  priority: 80,
  severity: "medium",
  description: "Riot Games account ID (Riot ID)",
  validator: (value, context) => {
    if (!value.includes("#")) return false;
    const [username, tagline] = value.split("#");
    if (username.length < 3 || username.length > 16) return false;
    if (tagline.length < 3 || tagline.length > 5) return false;
    return /riot|league[- ]?of[- ]?legends|valorant|tft|teamfight[- ]?tactics|gaming/i.test(context);
  }
};
var TWITCH_USERNAME = {
  type: "TWITCH_USERNAME",
  regex: /\bTWITCH[-\s]?(?:USER|NAME|ID)?[-\s]?[:#]?\s*([a-zA-Z0-9_]{4,25})\b/gi,
  placeholder: "[TWITCH_{n}]",
  priority: 75,
  severity: "medium",
  description: "Twitch username",
  validator: (value, context) => {
    const length = value.length;
    if (length < 4 || length > 25) return false;
    return /twitch|streaming|streamer|channel|live|broadcast/i.test(context);
  }
};
var ESPORTS_PLAYER_ID = {
  type: "ESPORTS_PLAYER_ID",
  regex: /\b(?:PLAYER|COMPETITOR|PARTICIPANT)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[PLAYER_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Esports player/competitor ID",
  validator: (_value, context) => {
    return /esports|tournament|competition|player|competitor|gaming|league/i.test(context);
  }
};
var TOURNAMENT_REGISTRATION_ID = {
  type: "TOURNAMENT_REGISTRATION_ID",
  regex: /\b(?:TOURNAMENT|BRACKET|REGISTRATION|REG)[-\s]?(?:ID|NO|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[TOURNEY_{n}]",
  priority: 75,
  severity: "medium",
  description: "Gaming tournament registration ID",
  validator: (_value, context) => {
    return /tournament|bracket|registration|competition|event|gaming|esports/i.test(context);
  }
};
var ROBLOX_USER_ID = {
  type: "ROBLOX_USER_ID",
  regex: /\bROBLOX[-\s]?(?:USER|ID)?[-\s]?[:#]?\s*(\d{1,12})\b/gi,
  placeholder: "[ROBLOX_{n}]",
  priority: 80,
  severity: "medium",
  description: "Roblox user ID",
  validator: (value, context) => {
    const length = value.length;
    if (length < 1 || length > 12) return false;
    return /roblox|robux|user|player|gaming/i.test(context);
  }
};
var MINECRAFT_UUID = {
  type: "MINECRAFT_UUID",
  regex: /\b([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})\b/gi,
  placeholder: "[MC_UUID_{n}]",
  priority: 80,
  severity: "medium",
  description: "Minecraft player UUID",
  validator: (value, context) => {
    const cleaned = value.replace(/-/g, "");
    if (cleaned.length !== 32) return false;
    if (!/^[0-9a-f]+$/i.test(cleaned)) return false;
    return /minecraft|mc|mojang|player|uuid|server/i.test(context);
  }
};
var FORTNITE_ACCOUNT_ID = {
  type: "FORTNITE_ACCOUNT_ID",
  regex: /\b(?:FORTNITE|FN)[-\s]?(?:ACCOUNT|USER|ID)?[-\s]?[:#]?\s*([a-f0-9]{32})\b/gi,
  placeholder: "[FN_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Fortnite account ID",
  validator: (value, context) => {
    if (value.length !== 32) return false;
    if (!/^[a-f0-9]+$/i.test(value)) return false;
    return /fortnite|epic[- ]?games|battle[- ]?royale|gaming/i.test(context);
  }
};
var COD_PLAYER_ID = {
  type: "COD_PLAYER_ID",
  regex: /\b([a-zA-Z0-9_]{3,16})#(\d{7})\b/g,
  placeholder: "[COD_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Call of Duty / Activision player ID",
  validator: (value, context) => {
    if (!value.includes("#")) return false;
    const [username, id] = value.split("#");
    if (username.length < 3 || username.length > 16) return false;
    if (id.length !== 7) return false;
    return /call[- ]?of[- ]?duty|cod|warzone|activision|gaming/i.test(context);
  }
};
var APEX_PLAYER_ID = {
  type: "APEX_PLAYER_ID",
  regex: /\b(?:APEX|EA)[-\s]?(?:ID|PLAYER)?[-\s]?[:#]?\s*([A-Z0-9]{10,16})\b/gi,
  placeholder: "[APEX_ID_{n}]",
  priority: 70,
  severity: "medium",
  description: "Apex Legends player ID",
  validator: (_value, context) => {
    return /apex[- ]?legends|apex|ea|respawn|gaming|player/i.test(context);
  }
};
var DOTA_FRIEND_ID = {
  type: "DOTA_FRIEND_ID",
  regex: /\bDOTA[-\s]?(?:ID|FRIEND)?[-\s]?[:#]?\s*(\d{9,10})\b/gi,
  placeholder: "[DOTA_ID_{n}]",
  priority: 70,
  severity: "medium",
  description: "Dota 2 friend ID",
  validator: (value, context) => {
    const length = value.length;
    if (length < 9 || length > 10) return false;
    return /dota|steam|valve|gaming|player|moba/i.test(context);
  }
};
var CSGO_FRIEND_CODE = {
  type: "CSGO_FRIEND_CODE",
  regex: /\b(?:CS:?GO|COUNTER[- ]?STRIKE)[-\s]?(?:FRIEND[- ]?CODE|CODE)?[-\s]?[:#]?\s*([A-Z0-9]{5}-[A-Z0-9]{5})\b/gi,
  placeholder: "[CSGO_CODE_{n}]",
  priority: 75,
  severity: "medium",
  description: "CS:GO friend code",
  validator: (value, context) => {
    if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(value)) return false;
    return /cs:?go|counter[- ]?strike|steam|valve|gaming/i.test(context);
  }
};
var OVERWATCH_BATTLETAG = {
  type: "OVERWATCH_BATTLETAG",
  regex: /\b([a-zA-Z][a-zA-Z0-9]{2,11})#(\d{4,5})\b/g,
  placeholder: "[OW_TAG_{n}]",
  priority: 75,
  severity: "medium",
  description: "Overwatch BattleTag",
  validator: (value, context) => {
    const parts = value.split("#");
    if (parts.length !== 2) return false;
    if (parts[0].length < 3 || parts[0].length > 12) return false;
    if (parts[1].length < 4 || parts[1].length > 5) return false;
    return /overwatch|ow2|blizzard|gaming|player/i.test(context);
  }
};
var gamingPatterns = [
  RIOT_ID,
  TWITCH_USERNAME,
  ESPORTS_PLAYER_ID,
  TOURNAMENT_REGISTRATION_ID,
  ROBLOX_USER_ID,
  MINECRAFT_UUID,
  FORTNITE_ACCOUNT_ID,
  COD_PLAYER_ID,
  APEX_PLAYER_ID,
  DOTA_FRIEND_ID,
  CSGO_FRIEND_CODE,
  OVERWATCH_BATTLETAG
];
var VIN_NUMBER = {
  type: "VIN_NUMBER",
  regex: /\bVIN[-\s\u00A0]?(?:NO|NUM|NUMBER)?[-\s\u00A0]?[:#]?\s*([A-HJ-NPR-Z0-9]{17})\b/gi,
  placeholder: "[VIN_{n}]",
  priority: 85,
  severity: "medium",
  description: "Vehicle Identification Number (VIN)",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "").toUpperCase();
    if (cleaned.length !== 17) return false;
    if (/[IOQ]/.test(cleaned)) return false;
    return /vin|vehicle|car|auto|motor|registration|title|insurance/i.test(context);
  }
};
var US_LICENSE_PLATE = {
  type: "US_LICENSE_PLATE",
  regex: /\b(?:PLATE|LICENSE|TAG)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{3,8})\b/gi,
  placeholder: "[PLATE_{n}]",
  priority: 75,
  severity: "medium",
  description: "US License Plate",
  validator: (value, context) => {
    if (!/plate|license|tag|vehicle|car|registration|dmv/i.test(context)) return false;
    if (/^\d+$/.test(value)) return false;
    if (value.length < 3) return false;
    return true;
  }
};
var CALIFORNIA_LICENSE_PLATE = {
  type: "CALIFORNIA_LICENSE_PLATE",
  regex: /\b(\d[A-Z]{3}\d{3})\b/g,
  placeholder: "[CA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "California License Plate",
  validator: (_value, context) => {
    return /california|ca\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEW_YORK_LICENSE_PLATE = {
  type: "NEW_YORK_LICENSE_PLATE",
  regex: /\b([A-Z]{3}-?\d{4})\b/g,
  placeholder: "[NY_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "New York License Plate",
  validator: (_value, context) => {
    return /new\s?york|ny\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var TEXAS_LICENSE_PLATE = {
  type: "TEXAS_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4}|[A-Z]{2}\d-[A-Z]\d{3})\b/g,
  placeholder: "[TX_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Texas License Plate",
  validator: (_value, context) => {
    return /texas|tx\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var FLORIDA_LICENSE_PLATE = {
  type: "FLORIDA_LICENSE_PLATE",
  regex: /\b([A-Z]{3,4}\s[A-Z]?\d{2})\b/g,
  placeholder: "[FL_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Florida License Plate",
  validator: (_value, context) => {
    return /florida|fl\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var ILLINOIS_LICENSE_PLATE = {
  type: "ILLINOIS_LICENSE_PLATE",
  regex: /\b([A-Z]{2}\d{5})\b/g,
  placeholder: "[IL_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Illinois License Plate",
  validator: (_value, context) => {
    return /illinois|il\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var PENNSYLVANIA_LICENSE_PLATE = {
  type: "PENNSYLVANIA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[PA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Pennsylvania License Plate",
  validator: (_value, context) => {
    return /pennsylvania|pa\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var OHIO_LICENSE_PLATE = {
  type: "OHIO_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[OH_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Ohio License Plate",
  validator: (_value, context) => {
    return /ohio|oh\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MICHIGAN_LICENSE_PLATE = {
  type: "MICHIGAN_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[MI_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Michigan License Plate",
  validator: (_value, context) => {
    return /michigan|mi\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var GEORGIA_LICENSE_PLATE = {
  type: "GEORGIA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[GA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Georgia License Plate",
  validator: (_value, context) => {
    return /georgia|ga\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NORTH_CAROLINA_LICENSE_PLATE = {
  type: "NORTH_CAROLINA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[NC_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "North Carolina License Plate",
  validator: (_value, context) => {
    return /north\s?carolina|nc\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEW_JERSEY_LICENSE_PLATE = {
  type: "NEW_JERSEY_LICENSE_PLATE",
  regex: /\b([A-Z]\d{2}[A-Z]{3})\b/g,
  placeholder: "[NJ_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "New Jersey License Plate",
  validator: (_value, context) => {
    return /new\s?jersey|nj\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var VIRGINIA_LICENSE_PLATE = {
  type: "VIRGINIA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[VA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Virginia License Plate",
  validator: (_value, context) => {
    return /virginia|va\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var WASHINGTON_LICENSE_PLATE = {
  type: "WASHINGTON_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[WA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Washington License Plate",
  validator: (_value, context) => {
    return /washington|wa\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MASSACHUSETTS_LICENSE_PLATE = {
  type: "MASSACHUSETTS_LICENSE_PLATE",
  regex: /\b(\d[A-Z]{3}\d{2})\b/g,
  placeholder: "[MA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Massachusetts License Plate",
  validator: (_value, context) => {
    return /massachusetts|ma\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var ARIZONA_LICENSE_PLATE = {
  type: "ARIZONA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[AZ_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Arizona License Plate",
  validator: (_value, context) => {
    return /arizona|az\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var TENNESSEE_LICENSE_PLATE = {
  type: "TENNESSEE_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[TN_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Tennessee License Plate",
  validator: (_value, context) => {
    return /tennessee|tn\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var INDIANA_LICENSE_PLATE = {
  type: "INDIANA_LICENSE_PLATE",
  regex: /\b(\d{3}[A-Z]{3})\b/g,
  placeholder: "[IN_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Indiana License Plate",
  validator: (_value, context) => {
    return /indiana|in\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MISSOURI_LICENSE_PLATE = {
  type: "MISSOURI_LICENSE_PLATE",
  regex: /\b([A-Z]{2}\d[A-Z]\d[A-Z])\b/g,
  placeholder: "[MO_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Missouri License Plate",
  validator: (_value, context) => {
    return /missouri|mo\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MARYLAND_LICENSE_PLATE = {
  type: "MARYLAND_LICENSE_PLATE",
  regex: /\b(\d[A-Z]{2}\d{4})\b/g,
  placeholder: "[MD_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Maryland License Plate",
  validator: (_value, context) => {
    return /maryland|md\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var WISCONSIN_LICENSE_PLATE = {
  type: "WISCONSIN_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{4})\b/g,
  placeholder: "[WI_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Wisconsin License Plate",
  validator: (_value, context) => {
    return /wisconsin|wi\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var COLORADO_LICENSE_PLATE = {
  type: "COLORADO_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[CO_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Colorado License Plate",
  validator: (_value, context) => {
    return /colorado|co\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MINNESOTA_LICENSE_PLATE = {
  type: "MINNESOTA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[MN_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Minnesota License Plate",
  validator: (_value, context) => {
    return /minnesota|mn\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var SOUTH_CAROLINA_LICENSE_PLATE = {
  type: "SOUTH_CAROLINA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[SC_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "South Carolina License Plate",
  validator: (_value, context) => {
    return /south\s?carolina|sc\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var ALABAMA_LICENSE_PLATE = {
  type: "ALABAMA_LICENSE_PLATE",
  regex: /\b(\d{2}[A-Z]{2}\d{3})\b/g,
  placeholder: "[AL_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Alabama License Plate",
  validator: (_value, context) => {
    return /alabama|al\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var LOUISIANA_LICENSE_PLATE = {
  type: "LOUISIANA_LICENSE_PLATE",
  regex: /\b(\d{3}[A-Z]{3})\b/g,
  placeholder: "[LA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Louisiana License Plate",
  validator: (_value, context) => {
    return /louisiana|la\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var KENTUCKY_LICENSE_PLATE = {
  type: "KENTUCKY_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[KY_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Kentucky License Plate",
  validator: (_value, context) => {
    return /kentucky|ky\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var OREGON_LICENSE_PLATE = {
  type: "OREGON_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[OR_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Oregon License Plate",
  validator: (_value, context) => {
    return /oregon|or\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var OKLAHOMA_LICENSE_PLATE = {
  type: "OKLAHOMA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[OK_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Oklahoma License Plate",
  validator: (_value, context) => {
    return /oklahoma|ok\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var CONNECTICUT_LICENSE_PLATE = {
  type: "CONNECTICUT_LICENSE_PLATE",
  regex: /\b(\d{3}[A-Z]{3}|[A-Z]{3}\d{3})\b/g,
  placeholder: "[CT_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Connecticut License Plate",
  validator: (_value, context) => {
    return /connecticut|ct\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var UTAH_LICENSE_PLATE = {
  type: "UTAH_LICENSE_PLATE",
  regex: /\b([A-Z]\d{2}[A-Z]{3})\b/g,
  placeholder: "[UT_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Utah License Plate",
  validator: (_value, context) => {
    return /utah|ut\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var IOWA_LICENSE_PLATE = {
  type: "IOWA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[IA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Iowa License Plate",
  validator: (_value, context) => {
    return /iowa|ia\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEVADA_LICENSE_PLATE = {
  type: "NEVADA_LICENSE_PLATE",
  regex: /\b(\d{2}[A-Z]\d{3})\b/g,
  placeholder: "[NV_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Nevada License Plate",
  validator: (_value, context) => {
    return /nevada|nv\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var ARKANSAS_LICENSE_PLATE = {
  type: "ARKANSAS_LICENSE_PLATE",
  regex: /\b(\d{3}[A-Z]{3})\b/g,
  placeholder: "[AR_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Arkansas License Plate",
  validator: (_value, context) => {
    return /arkansas|ar\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MISSISSIPPI_LICENSE_PLATE = {
  type: "MISSISSIPPI_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[MS_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Mississippi License Plate",
  validator: (_value, context) => {
    return /mississippi|ms\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var KANSAS_LICENSE_PLATE = {
  type: "KANSAS_LICENSE_PLATE",
  regex: /\b(\d{3}[A-Z]{3})\b/g,
  placeholder: "[KS_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Kansas License Plate",
  validator: (_value, context) => {
    return /kansas|ks\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEW_MEXICO_LICENSE_PLATE = {
  type: "NEW_MEXICO_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[NM_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "New Mexico License Plate",
  validator: (_value, context) => {
    return /new\s?mexico|nm\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEBRASKA_LICENSE_PLATE = {
  type: "NEBRASKA_LICENSE_PLATE",
  regex: /\b([A-Z]\d{5})\b/g,
  placeholder: "[NE_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Nebraska License Plate",
  validator: (_value, context) => {
    return /nebraska|ne\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var WEST_VIRGINIA_LICENSE_PLATE = {
  type: "WEST_VIRGINIA_LICENSE_PLATE",
  regex: /\b(\d[A-Z]{2}\d{3})\b/g,
  placeholder: "[WV_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "West Virginia License Plate",
  validator: (_value, context) => {
    return /west\s?virginia|wv\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var IDAHO_LICENSE_PLATE = {
  type: "IDAHO_LICENSE_PLATE",
  regex: /\b(\d[A-Z]\d{5})\b/g,
  placeholder: "[ID_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Idaho License Plate",
  validator: (_value, context) => {
    return /idaho|id\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var HAWAII_LICENSE_PLATE = {
  type: "HAWAII_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[HI_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Hawaii License Plate",
  validator: (_value, context) => {
    return /hawaii|hi\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NEW_HAMPSHIRE_LICENSE_PLATE = {
  type: "NEW_HAMPSHIRE_LICENSE_PLATE",
  regex: /\b(\d{3,4}[A-Z]{2})\b/g,
  placeholder: "[NH_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "New Hampshire License Plate",
  validator: (_value, context) => {
    return /new\s?hampshire|nh\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MAINE_LICENSE_PLATE = {
  type: "MAINE_LICENSE_PLATE",
  regex: /\b(\d{4}[A-Z]{2})\b/g,
  placeholder: "[ME_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Maine License Plate",
  validator: (_value, context) => {
    return /maine|me\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var MONTANA_LICENSE_PLATE = {
  type: "MONTANA_LICENSE_PLATE",
  regex: /\b(\d-\d{5}[A-Z])\b/g,
  placeholder: "[MT_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Montana License Plate",
  validator: (_value, context) => {
    return /montana|mt\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var RHODE_ISLAND_LICENSE_PLATE = {
  type: "RHODE_ISLAND_LICENSE_PLATE",
  regex: /\b(\d{6})\b/g,
  placeholder: "[RI_PLATE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Rhode Island License Plate",
  validator: (_value, context) => {
    return /rhode\s?island|ri\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var DELAWARE_LICENSE_PLATE = {
  type: "DELAWARE_LICENSE_PLATE",
  regex: /\b(\d{6})\b/g,
  placeholder: "[DE_PLATE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Delaware License Plate",
  validator: (_value, context) => {
    return /delaware|de\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var SOUTH_DAKOTA_LICENSE_PLATE = {
  type: "SOUTH_DAKOTA_LICENSE_PLATE",
  regex: /\b(\d{2}[A-Z]\d{3})\b/g,
  placeholder: "[SD_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "South Dakota License Plate",
  validator: (_value, context) => {
    return /south\s?dakota|sd\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var NORTH_DAKOTA_LICENSE_PLATE = {
  type: "NORTH_DAKOTA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[ND_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "North Dakota License Plate",
  validator: (_value, context) => {
    return /north\s?dakota|nd\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var ALASKA_LICENSE_PLATE = {
  type: "ALASKA_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[AK_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Alaska License Plate",
  validator: (_value, context) => {
    return /alaska|ak\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var VERMONT_LICENSE_PLATE = {
  type: "VERMONT_LICENSE_PLATE",
  regex: /\b([A-Z]{3}\d{3})\b/g,
  placeholder: "[VT_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Vermont License Plate",
  validator: (_value, context) => {
    return /vermont|vt\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var WYOMING_LICENSE_PLATE = {
  type: "WYOMING_LICENSE_PLATE",
  regex: /\b(\d{5})\b/g,
  placeholder: "[WY_PLATE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Wyoming License Plate",
  validator: (_value, context) => {
    return /wyoming|wy\s|plate|license|dmv|vehicle/i.test(context);
  }
};
var UK_LICENSE_PLATE = {
  type: "UK_LICENSE_PLATE",
  regex: /\b([A-Z]{2}\d{2}\s?[A-Z]{3})\b/g,
  placeholder: "[UK_PLATE_{n}]",
  priority: 85,
  severity: "medium",
  description: "UK Vehicle Registration Plate",
  validator: (_value, context) => {
    return /uk|british|britain|registration|number\s?plate|vehicle|dvla/i.test(context);
  }
};
var GERMAN_LICENSE_PLATE = {
  type: "GERMAN_LICENSE_PLATE",
  regex: /\b([A-ZÄÖÜ]{1,3}[-\s][A-ZÄÖÜ]{1,2}\s?\d{1,4})\b/gi,
  placeholder: "[DE_PLATE_{n}]",
  priority: 85,
  severity: "medium",
  description: "German License Plate (Kennzeichen)",
  validator: (_value, context) => {
    return /german|deutschland|kennzeichen|license|plate|vehicle|kfz/i.test(context);
  }
};
var FRENCH_LICENSE_PLATE = {
  type: "FRENCH_LICENSE_PLATE",
  regex: /\b([A-Z]{2}-\d{3}-[A-Z]{2})\b/gi,
  placeholder: "[FR_PLATE_{n}]",
  priority: 85,
  severity: "medium",
  description: "French License Plate (Plaque d'immatriculation)",
  validator: (_value, context) => {
    return /french|france|immatriculation|license|plate|vehicle/i.test(context);
  }
};
var CANADIAN_LICENSE_PLATE = {
  type: "CANADIAN_LICENSE_PLATE",
  regex: /\b([A-Z]{3,4}[-\s]?\d{3,4})\b/g,
  placeholder: "[CA_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Canadian License Plate",
  validator: (_value, context) => {
    return /canad|ontario|quebec|british\s?columbia|alberta|plate|license|vehicle/i.test(context);
  }
};
var AUSTRALIAN_LICENSE_PLATE = {
  type: "AUSTRALIAN_LICENSE_PLATE",
  regex: /\b([A-Z]{2,3}[-\s]?\d{2,4})\b/g,
  placeholder: "[AU_PLATE_{n}]",
  priority: 80,
  severity: "medium",
  description: "Australian License Plate",
  validator: (_value, context) => {
    return /australia|nsw|victoria|queensland|south\s?australia|plate|license|rego|registration/i.test(context);
  }
};
var JAPANESE_LICENSE_PLATE = {
  type: "JAPANESE_LICENSE_PLATE",
  regex: /\b([あ-ん]{1}\s?\d{2}-\d{2}|\d{2,3}\s?[あ-ん]\s?\d{2}-\d{2})\b/g,
  placeholder: "[JP_PLATE_{n}]",
  priority: 85,
  severity: "medium",
  description: "Japanese License Plate (\u30CA\u30F3\u30D0\u30FC\u30D7\u30EC\u30FC\u30C8)",
  validator: (_value, context) => {
    return /japan|japanese|ナンバー|車両|plate|license|vehicle/i.test(context);
  }
};
var INTERNATIONAL_LICENSE_PLATE = {
  type: "INTERNATIONAL_LICENSE_PLATE",
  regex: /\b(?:PLATE|REGISTRATION|TAG)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{4,10})\b/gi,
  placeholder: "[PLATE_{n}]",
  priority: 70,
  severity: "medium",
  description: "International License Plate",
  validator: (_value, context) => {
    return /plate|registration|license|vehicle|car|motor/i.test(context);
  }
};
var vehiclePatterns = [
  VIN_NUMBER,
  US_LICENSE_PLATE,
  CALIFORNIA_LICENSE_PLATE,
  NEW_YORK_LICENSE_PLATE,
  TEXAS_LICENSE_PLATE,
  FLORIDA_LICENSE_PLATE,
  ILLINOIS_LICENSE_PLATE,
  PENNSYLVANIA_LICENSE_PLATE,
  OHIO_LICENSE_PLATE,
  MICHIGAN_LICENSE_PLATE,
  GEORGIA_LICENSE_PLATE,
  NORTH_CAROLINA_LICENSE_PLATE,
  NEW_JERSEY_LICENSE_PLATE,
  VIRGINIA_LICENSE_PLATE,
  WASHINGTON_LICENSE_PLATE,
  MASSACHUSETTS_LICENSE_PLATE,
  ARIZONA_LICENSE_PLATE,
  TENNESSEE_LICENSE_PLATE,
  INDIANA_LICENSE_PLATE,
  MISSOURI_LICENSE_PLATE,
  MARYLAND_LICENSE_PLATE,
  WISCONSIN_LICENSE_PLATE,
  COLORADO_LICENSE_PLATE,
  MINNESOTA_LICENSE_PLATE,
  SOUTH_CAROLINA_LICENSE_PLATE,
  ALABAMA_LICENSE_PLATE,
  LOUISIANA_LICENSE_PLATE,
  KENTUCKY_LICENSE_PLATE,
  OREGON_LICENSE_PLATE,
  OKLAHOMA_LICENSE_PLATE,
  CONNECTICUT_LICENSE_PLATE,
  UTAH_LICENSE_PLATE,
  IOWA_LICENSE_PLATE,
  NEVADA_LICENSE_PLATE,
  ARKANSAS_LICENSE_PLATE,
  MISSISSIPPI_LICENSE_PLATE,
  KANSAS_LICENSE_PLATE,
  NEW_MEXICO_LICENSE_PLATE,
  NEBRASKA_LICENSE_PLATE,
  WEST_VIRGINIA_LICENSE_PLATE,
  IDAHO_LICENSE_PLATE,
  HAWAII_LICENSE_PLATE,
  NEW_HAMPSHIRE_LICENSE_PLATE,
  MAINE_LICENSE_PLATE,
  MONTANA_LICENSE_PLATE,
  RHODE_ISLAND_LICENSE_PLATE,
  DELAWARE_LICENSE_PLATE,
  SOUTH_DAKOTA_LICENSE_PLATE,
  NORTH_DAKOTA_LICENSE_PLATE,
  ALASKA_LICENSE_PLATE,
  VERMONT_LICENSE_PLATE,
  WYOMING_LICENSE_PLATE,
  UK_LICENSE_PLATE,
  GERMAN_LICENSE_PLATE,
  FRENCH_LICENSE_PLATE,
  CANADIAN_LICENSE_PLATE,
  AUSTRALIAN_LICENSE_PLATE,
  JAPANESE_LICENSE_PLATE,
  INTERNATIONAL_LICENSE_PLATE
];
var FEDEX_TRACKING = {
  type: "FEDEX_TRACKING",
  regex: /\b(?:FEDEX|FDX)[-\s]?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{12}|\d{15}|\d{20})\b/gi,
  placeholder: "[FEDEX_TRACK_{n}]",
  priority: 85,
  severity: "low",
  description: "FedEx tracking number",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 12 && len !== 15 && len !== 20) return false;
    return /fedex|fed\s?ex|fdx|tracking|shipment|package|delivery/i.test(context);
  }
};
var UPS_TRACKING = {
  type: "UPS_TRACKING",
  regex: /\b(?:UPS[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(1Z[A-Z0-9]{16})\b/gi,
  placeholder: "[UPS_TRACK_{n}]",
  priority: 90,
  severity: "low",
  description: "UPS tracking number",
  validator: (value, context) => {
    if (!value.startsWith("1Z")) return false;
    if (value.length !== 18) return false;
    return /ups|tracking|shipment|package|delivery/i.test(context);
  }
};
var USPS_TRACKING = {
  type: "USPS_TRACKING",
  regex: /\b(?:USPS|US\s?MAIL)[-\s]?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{20,22}|[A-Z]{2}\d{9}US)\b/gi,
  placeholder: "[USPS_TRACK_{n}]",
  priority: 85,
  severity: "low",
  description: "USPS tracking number",
  validator: (value, context) => {
    if (value.includes("US")) return value.length === 13 && /^[A-Z]{2}\d{9}US$/.test(value);
    const len = value.length;
    if (len < 20 || len > 22) return false;
    return /usps|us\s?mail|postal|tracking|shipment|package|delivery/i.test(context);
  }
};
var DHL_TRACKING = {
  type: "DHL_TRACKING",
  regex: /\b(?:DHL[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{10,11})\b/gi,
  placeholder: "[DHL_TRACK_{n}]",
  priority: 85,
  severity: "low",
  description: "DHL tracking number",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 10 && len !== 11) return false;
    return /dhl|tracking|shipment|package|delivery|express/i.test(context);
  }
};
var AMAZON_TRACKING = {
  type: "AMAZON_TRACKING",
  regex: /\b(TBA\d{12})\b/gi,
  placeholder: "[AMAZON_TRACK_{n}]",
  priority: 90,
  severity: "low",
  description: "Amazon tracking number",
  validator: (value, _context) => {
    return value.startsWith("TBA") && value.length === 15;
  }
};
var TNT_TRACKING = {
  type: "TNT_TRACKING",
  regex: /\b(?:TNT[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{9}|[A-Z0-9]{13})\b/gi,
  placeholder: "[TNT_TRACK_{n}]",
  priority: 85,
  severity: "low",
  description: "TNT Express tracking number",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 9 && len !== 13) return false;
    return /tnt|tracking|shipment|package|delivery|express/i.test(context);
  }
};
var CHINA_POST_TRACKING = {
  type: "CHINA_POST_TRACKING",
  regex: /\b(?:CHINA\s?POST[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([RC][A-Z]\d{9}CN)\b/gi,
  placeholder: "[CHINA_POST_{n}]",
  priority: 85,
  severity: "low",
  description: "China Post tracking number",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!value.endsWith("CN")) return false;
    if (!/^[RC]/.test(value)) return false;
    return /china\s?post|tracking|shipment|package|delivery/i.test(context);
  }
};
var JAPAN_POST_TRACKING = {
  type: "JAPAN_POST_TRACKING",
  regex: /\b(?:JAPAN\s?POST[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}\d{9}JP)\b/gi,
  placeholder: "[JAPAN_POST_{n}]",
  priority: 85,
  severity: "low",
  description: "Japan Post tracking number",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!value.endsWith("JP")) return false;
    return /japan\s?post|tracking|shipment|package|delivery/i.test(context);
  }
};
var ROYAL_MAIL_TRACKING = {
  type: "ROYAL_MAIL_TRACKING",
  regex: /\b(?:ROYAL\s?MAIL[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}\d{9}GB)\b/gi,
  placeholder: "[ROYAL_MAIL_{n}]",
  priority: 85,
  severity: "low",
  description: "Royal Mail tracking number",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!value.endsWith("GB")) return false;
    return /royal\s?mail|tracking|shipment|package|delivery|post\s?office/i.test(context);
  }
};
var CANADA_POST_TRACKING = {
  type: "CANADA_POST_TRACKING",
  regex: /\b(?:CANADA\s?POST[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{16})\b/gi,
  placeholder: "[CANADA_POST_{n}]",
  priority: 85,
  severity: "low",
  description: "Canada Post tracking number",
  validator: (value, context) => {
    if (value.length !== 16) return false;
    return /canada\s?post|tracking|shipment|package|delivery|postes|canada/i.test(context);
  }
};
var AUSTRALIA_POST_TRACKING = {
  type: "AUSTRALIA_POST_TRACKING",
  regex: /\b(?:AUSTRALIA\s?POST[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}\d{9}AU)\b/gi,
  placeholder: "[AUSTRALIA_POST_{n}]",
  priority: 85,
  severity: "low",
  description: "Australia Post tracking number",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!value.endsWith("AU")) return false;
    return /australia\s?post|aus\s?post|tracking|shipment|package|delivery/i.test(context);
  }
};
var PUROLATOR_TRACKING = {
  type: "PUROLATOR_TRACKING",
  regex: /\b(?:PUROLATOR[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER|PIN)?[-\s]?[:#]?\s*(\d{12}|P\d{10})\b/gi,
  placeholder: "[PUROLATOR_{n}]",
  priority: 85,
  severity: "low",
  description: "Purolator tracking number",
  validator: (value, context) => {
    if (value.startsWith("P")) return value.length === 11;
    if (value.length !== 12) return false;
    return /purolator|tracking|shipment|package|delivery/i.test(context);
  }
};
var ONTRAC_TRACKING = {
  type: "ONTRAC_TRACKING",
  regex: /\b(?:ONTRAC|ON\s?TRAC|LASERSHIP)[-\s]?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(C\d{14})\b/gi,
  placeholder: "[ONTRAC_{n}]",
  priority: 85,
  severity: "low",
  description: "OnTrac/LaserShip tracking number",
  validator: (value, context) => {
    if (!value.startsWith("C")) return false;
    if (value.length !== 15) return false;
    return /ontrac|on\s?trac|lasership|tracking|shipment|package|delivery/i.test(context);
  }
};
var GLS_TRACKING = {
  type: "GLS_TRACKING",
  regex: /\b(?:GLS[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{11,13})\b/gi,
  placeholder: "[GLS_{n}]",
  priority: 80,
  severity: "low",
  description: "GLS tracking number (Europe)",
  validator: (value, context) => {
    const len = value.length;
    if (len < 11 || len > 13) return false;
    return /gls|general\s?logistics|tracking|shipment|package|delivery/i.test(context);
  }
};
var ARAMEX_TRACKING = {
  type: "ARAMEX_TRACKING",
  regex: /\b(?:ARAMEX[-\s]?)?(?:TRACK(?:ING)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{11,12})\b/gi,
  placeholder: "[ARAMEX_{n}]",
  priority: 85,
  severity: "low",
  description: "Aramex tracking number",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 11 && len !== 12) return false;
    return /aramex|tracking|shipment|package|delivery|express/i.test(context);
  }
};
var GENERIC_TRACKING_NUMBER = {
  type: "GENERIC_TRACKING_NUMBER",
  regex: /\b(?:TRACK(?:ING)?|SHIPMENT|PACKAGE)[-\s]?(?:ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{10,25})\b/gi,
  placeholder: "[TRACKING_{n}]",
  priority: 70,
  severity: "low",
  description: "Generic tracking number",
  validator: (value, context) => {
    if (!/track|ship|package|delivery|carrier|freight/i.test(context)) return false;
    const len = value.length;
    return len >= 10 && len <= 25;
  }
};
var BILL_OF_LADING = {
  type: "BILL_OF_LADING",
  regex: /\b(?:BOL|B\/L|BILL\s?OF\s?LADING)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,20})\b/gi,
  placeholder: "[BOL_{n}]",
  priority: 85,
  severity: "medium",
  description: "Bill of Lading number",
  validator: (_value, context) => {
    return /bill\s?of\s?lading|bol|b\/l|shipping|freight|cargo|shipment/i.test(context);
  }
};
var SHIPPING_CONTAINER_NUMBER = {
  type: "SHIPPING_CONTAINER_NUMBER",
  regex: /\b([A-Z]{4}\d{7})\b/g,
  placeholder: "[CONTAINER_{n}]",
  priority: 85,
  severity: "medium",
  description: "Shipping container number (ISO 6346)",
  validator: (value, context) => {
    if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(value)) return false;
    return /container|shipping|freight|cargo|iso\s?6346/i.test(context);
  }
};
var AIR_WAYBILL_NUMBER = {
  type: "AIR_WAYBILL_NUMBER",
  regex: /\b(?:AWB|AIR\s?WAYBILL)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{3}[-\s]?\d{8})\b/gi,
  placeholder: "[AWB_{n}]",
  priority: 85,
  severity: "medium",
  description: "Air Waybill number",
  validator: (value, context) => {
    if (value.replace(/\D/g, "").length !== 11) return false;
    return /awb|air\s?waybill|air\s?freight|cargo|shipment/i.test(context);
  }
};
var PRO_NUMBER = {
  type: "PRO_NUMBER",
  regex: /\bPRO[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{9,10})\b/gi,
  placeholder: "[PRO_{n}]",
  priority: 85,
  severity: "low",
  description: "PRO number (freight)",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 9 && len !== 10) return false;
    return /pro\s?number|freight|ltl|shipment|carrier/i.test(context);
  }
};
var MASTER_AIRWAY_BILL = {
  type: "MASTER_AIRWAY_BILL",
  regex: /\bMAWB[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{3}[-\s]?\d{8})\b/gi,
  placeholder: "[MAWB_{n}]",
  priority: 85,
  severity: "medium",
  description: "Master Airway Bill",
  validator: (value, context) => {
    if (value.replace(/\D/g, "").length !== 11) return false;
    return /mawb|master\s?airway|consolidation|freight|cargo/i.test(context);
  }
};
var logisticsPatterns = [
  FEDEX_TRACKING,
  UPS_TRACKING,
  USPS_TRACKING,
  DHL_TRACKING,
  AMAZON_TRACKING,
  TNT_TRACKING,
  CHINA_POST_TRACKING,
  JAPAN_POST_TRACKING,
  ROYAL_MAIL_TRACKING,
  CANADA_POST_TRACKING,
  AUSTRALIA_POST_TRACKING,
  PUROLATOR_TRACKING,
  ONTRAC_TRACKING,
  GLS_TRACKING,
  ARAMEX_TRACKING,
  GENERIC_TRACKING_NUMBER,
  BILL_OF_LADING,
  SHIPPING_CONTAINER_NUMBER,
  AIR_WAYBILL_NUMBER,
  PRO_NUMBER,
  MASTER_AIRWAY_BILL
];
var IATA_AIRPORT_CODE = {
  type: "IATA_AIRPORT_CODE",
  regex: /\b(?:AIRPORT|FROM|TO|VIA|IATA)[-\s]?(?:CODE)?[-\s]?[:#]?\s*([A-Z]{3})\b/gi,
  placeholder: "[AIRPORT_{n}]",
  priority: 75,
  severity: "low",
  description: "IATA Airport Code",
  validator: (_value, context) => {
    return /airport|iata|flight|departure|arrival|terminal/i.test(context);
  }
};
var FLIGHT_NUMBER = {
  type: "FLIGHT_NUMBER",
  regex: /\b(?:FLIGHT|FLT)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2,3}\s?\d{1,4})\b/gi,
  placeholder: "[FLIGHT_{n}]",
  priority: 80,
  severity: "low",
  description: "Flight Number",
  validator: (value, context) => {
    const clean = value.replace(/\s/g, "");
    if (!/^[A-Z]{2,3}\d{1,4}$/.test(clean)) return false;
    return /flight|airline|departure|arrival|boarding|gate/i.test(context);
  }
};
var AIRCRAFT_TAIL_NUMBER = {
  type: "AIRCRAFT_TAIL_NUMBER",
  regex: /\b(N[1-9][0-9]{0,4}[A-Z]{0,2})\b/g,
  placeholder: "[TAIL_{n}]",
  priority: 85,
  severity: "medium",
  description: "Aircraft Tail Number (US N-Number)",
  validator: (value, _context) => {
    if (!value.startsWith("N")) return false;
    if (value.length < 2 || value.length > 6) return false;
    if (value[1] === "0") return false;
    return true;
  }
};
var AIRCRAFT_REGISTRATION = {
  type: "AIRCRAFT_REGISTRATION",
  regex: /\b(?:REGISTRATION|REG|TAIL)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{1,2}-[A-Z0-9]{3,5})\b/gi,
  placeholder: "[AIRCRAFT_REG_{n}]",
  priority: 85,
  severity: "medium",
  description: "International Aircraft Registration",
  validator: (_value, context) => {
    return /aircraft|plane|aviation|registration|tail\s?number/i.test(context);
  }
};
var FAA_AIRMAN_CERTIFICATE = {
  type: "FAA_AIRMAN_CERTIFICATE",
  regex: /\b(?:FAA|AIRMAN|PILOT)[-\s]?(?:CERT(?:IFICATE)?|LICENSE)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{7,8})\b/gi,
  placeholder: "[FAA_CERT_{n}]",
  priority: 85,
  severity: "medium",
  description: "FAA Airman Certificate Number",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 7 && len !== 8) return false;
    return /faa|airman|pilot|certificate|license|aviation/i.test(context);
  }
};
var ICAO_AIRCRAFT_TYPE = {
  type: "ICAO_AIRCRAFT_TYPE",
  regex: /\b(?:AIRCRAFT|TYPE|ICAO)[-\s]?(?:CODE|DESIGNATOR)?[-\s]?[:#]?\s*([A-Z][0-9][A-Z0-9]{1,2})\b/gi,
  placeholder: "[AIRCRAFT_TYPE_{n}]",
  priority: 70,
  severity: "low",
  description: "ICAO Aircraft Type Designator",
  validator: (_value, context) => {
    return /aircraft|type|icao|model|boeing|airbus/i.test(context);
  }
};
var AIRCRAFT_MODE_S = {
  type: "AIRCRAFT_MODE_S",
  regex: /\b(?:MODE\s?S|ICAO\s?ADDRESS)[-\s]?[:#]?\s*([A-F0-9]{6})\b/gi,
  placeholder: "[MODE_S_{n}]",
  priority: 85,
  severity: "medium",
  description: "Aircraft Mode S Code (ICAO 24-bit address)",
  validator: (value, context) => {
    if (value.length !== 6) return false;
    if (!/^[A-F0-9]{6}$/i.test(value)) return false;
    return /mode\s?s|icao|aircraft|transponder|adsb/i.test(context);
  }
};
var AIRLINE_BOOKING_REFERENCE = {
  type: "AIRLINE_BOOKING_REFERENCE",
  regex: /\b(?:BOOKING|RESERVATION|LOCATOR|REFERENCE)[-\s]?(?:CODE|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6})\b/gi,
  placeholder: "[BOOKING_REF_{n}]",
  priority: 85,
  severity: "medium",
  description: "Airline Booking Reference/Locator",
  validator: (_value, context) => {
    return /booking|reservation|locator|reference|pnr|airline|flight/i.test(context);
  }
};
var IATA_AIRLINE_CODE = {
  type: "IATA_AIRLINE_CODE",
  regex: /\b(?:AIRLINE|CARRIER)[-\s]?(?:CODE|IATA)?[-\s]?[:#]?\s*([A-Z]{2})\b/gi,
  placeholder: "[AIRLINE_{n}]",
  priority: 70,
  severity: "low",
  description: "IATA Airline Code",
  validator: (_value, context) => {
    return /airline|carrier|iata|flight|aviation/i.test(context);
  }
};
var aviationPatterns = [
  IATA_AIRPORT_CODE,
  FLIGHT_NUMBER,
  AIRCRAFT_TAIL_NUMBER,
  AIRCRAFT_REGISTRATION,
  FAA_AIRMAN_CERTIFICATE,
  ICAO_AIRCRAFT_TYPE,
  AIRCRAFT_MODE_S,
  AIRLINE_BOOKING_REFERENCE,
  IATA_AIRLINE_CODE
];
var IMO_NUMBER = {
  type: "IMO_NUMBER",
  regex: /\bIMO[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{7})\b/gi,
  placeholder: "[IMO_{n}]",
  priority: 90,
  severity: "medium",
  description: "IMO Ship Identification Number",
  validator: (value, context) => {
    if (value.length !== 7) return false;
    const digits = value.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 6; i++) sum += digits[i] * (7 - i);
    if (sum % 10 !== digits[6]) return false;
    return /imo|ship|vessel|maritime|shipping|marine/i.test(context);
  }
};
var MMSI_NUMBER = {
  type: "MMSI_NUMBER",
  regex: /\bMMSI[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{9})\b/gi,
  placeholder: "[MMSI_{n}]",
  priority: 90,
  severity: "medium",
  description: "MMSI (Maritime Mobile Service Identity)",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    const mid = parseInt(value.substring(0, 3));
    if (mid < 200 || mid > 799) return false;
    return /mmsi|maritime|ship|vessel|ais|vhf|radio/i.test(context);
  }
};
var MARITIME_CALLSIGN = {
  type: "MARITIME_CALLSIGN",
  regex: /\b(?:CALLSIGN|CALL\s?SIGN)[-\s]?[:#]?\s*([A-Z0-9]{3,7})\b/gi,
  placeholder: "[CALLSIGN_{n}]",
  priority: 85,
  severity: "low",
  description: "Maritime Radio Callsign",
  validator: (_value, context) => {
    return /callsign|call\s?sign|radio|maritime|vessel|ship|vhf/i.test(context);
  }
};
var OFFICIAL_SHIP_NUMBER = {
  type: "OFFICIAL_SHIP_NUMBER",
  regex: /\b(?:OFFICIAL|SHIP)[-\s]?(?:NO|NUM|NUMBER)[-\s]?[:#]?\s*([A-Z0-9]{5,12})\b/gi,
  placeholder: "[SHIP_NUM_{n}]",
  priority: 80,
  severity: "medium",
  description: "Official Ship Number",
  validator: (_value, context) => {
    return /official|ship|vessel|registration|registry|flag\s?state/i.test(context);
  }
};
var PSC_INSPECTION_ID = {
  type: "PSC_INSPECTION_ID",
  regex: /\b(?:PSC|INSPECTION)[-\s]?(?:ID|NO|NUM|NUMBER)[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[PSC_{n}]",
  priority: 80,
  severity: "low",
  description: "Port State Control Inspection ID",
  validator: (_value, context) => {
    return /psc|port\s?state|inspection|maritime|vessel|ship|compliance/i.test(context);
  }
};
var SEAFARER_ID = {
  type: "SEAFARER_ID",
  regex: /\b(?:SEAFARER|MARINER|SID)[-\s]?(?:ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2,3}[A-Z0-9]{9})\b/gi,
  placeholder: "[SEAFARER_{n}]",
  priority: 85,
  severity: "high",
  description: "Seafarer Identification Number",
  validator: (value, context) => {
    if (value.length < 11 || value.length > 12) return false;
    return /seafarer|mariner|sid|maritime|crew|seaman|sailor/i.test(context);
  }
};
var LLOYDS_REGISTER_NUMBER = {
  type: "LLOYDS_REGISTER_NUMBER",
  regex: /\b(?:LLOYD'?S?|LR)[-\s]?(?:REG(?:ISTER)?|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{7})\b/gi,
  placeholder: "[LR_NUM_{n}]",
  priority: 85,
  severity: "low",
  description: "Lloyd's Register Number",
  validator: (_value, context) => {
    return /lloyd|lr|register|classification|ship|vessel|maritime/i.test(context);
  }
};
var maritimePatterns = [
  IMO_NUMBER,
  MMSI_NUMBER,
  MARITIME_CALLSIGN,
  OFFICIAL_SHIP_NUMBER,
  PSC_INSPECTION_ID,
  SEAFARER_ID,
  LLOYDS_REGISTER_NUMBER
];
var EPA_ID_NUMBER = {
  type: "EPA_ID_NUMBER",
  regex: /\bEPA[-\s]?(?:ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}[A-Z0-9]{9})\b/gi,
  placeholder: "[EPA_ID_{n}]",
  priority: 85,
  severity: "medium",
  description: "EPA Identification Number",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    const stateCode = value.substring(0, 2);
    if (!/^[A-Z]{2}$/.test(stateCode)) return false;
    return /epa|environmental|hazardous|waste|rcra|generator/i.test(context);
  }
};
var NPDES_PERMIT = {
  type: "NPDES_PERMIT",
  regex: /\bNPDES[-\s]?(?:PERMIT|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}[A-Z0-9]{7,9})\b/gi,
  placeholder: "[NPDES_{n}]",
  priority: 85,
  severity: "medium",
  description: "NPDES Permit Number",
  validator: (_value, context) => {
    return /npdes|permit|discharge|wastewater|water\s?quality/i.test(context);
  }
};
var HAZARDOUS_WASTE_MANIFEST = {
  type: "HAZARDOUS_WASTE_MANIFEST",
  regex: /\b(?:MANIFEST|WASTE)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{9})\b/gi,
  placeholder: "[MANIFEST_{n}]",
  priority: 80,
  severity: "medium",
  description: "Hazardous Waste Manifest Number",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    return /manifest|hazardous|waste|rcra|generator|transporter/i.test(context);
  }
};
var AIR_QUALITY_PERMIT = {
  type: "AIR_QUALITY_PERMIT",
  regex: /\b(?:AIR|EMISSION)[-\s]?PERMIT[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[AIR_PERMIT_{n}]",
  priority: 80,
  severity: "low",
  description: "Air Quality Permit Number",
  validator: (_value, context) => {
    return /air|emission|permit|quality|pollution|stack/i.test(context);
  }
};
var WATER_QUALITY_CERTIFICATE = {
  type: "WATER_QUALITY_CERTIFICATE",
  regex: /\bWATER[-\s]?(?:QUALITY|CERT(?:IFICATE)?)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[WATER_CERT_{n}]",
  priority: 80,
  severity: "low",
  description: "Water Quality Certificate Number",
  validator: (_value, context) => {
    return /water|quality|certificate|permit|discharge|wetland/i.test(context);
  }
};
var STORM_WATER_PERMIT = {
  type: "STORM_WATER_PERMIT",
  regex: /\bSTORM\s?WATER[-\s]?PERMIT[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{2}[A-Z0-9]{6,10})\b/gi,
  placeholder: "[STORM_PERMIT_{n}]",
  priority: 80,
  severity: "low",
  description: "Storm Water Permit Number",
  validator: (_value, context) => {
    return /storm|water|runoff|permit|npdes|swppp/i.test(context);
  }
};
var UST_ID = {
  type: "UST_ID",
  regex: /\bUST[-\s]?(?:ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,12})\b/gi,
  placeholder: "[UST_{n}]",
  priority: 80,
  severity: "medium",
  description: "Underground Storage Tank ID",
  validator: (_value, context) => {
    return /ust|underground|storage|tank|petroleum|fuel/i.test(context);
  }
};
var FACILITY_ID = {
  type: "FACILITY_ID",
  regex: /\bFACILITY[-\s]?ID[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[FACILITY_{n}]",
  priority: 75,
  severity: "low",
  description: "Environmental Facility ID",
  validator: (_value, context) => {
    return /facility|plant|site|environmental|epa|compliance/i.test(context);
  }
};
var TRI_FACILITY_ID = {
  type: "TRI_FACILITY_ID",
  regex: /\bTRI[-\s]?(?:FACILITY|ID)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{11})\b/gi,
  placeholder: "[TRI_FAC_{n}]",
  priority: 85,
  severity: "low",
  description: "TRI Facility ID Number",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    return /tri|toxic\s?release|inventory|facility|epa|emissions/i.test(context);
  }
};
var SPILL_REPORT_NUMBER = {
  type: "SPILL_REPORT_NUMBER",
  regex: /\bSPILL[-\s]?(?:REPORT|NO|NUM|NUMBER)[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[SPILL_{n}]",
  priority: 80,
  severity: "medium",
  description: "Environmental Spill Report Number",
  validator: (_value, context) => {
    return /spill|release|incident|environmental|response|cleanup/i.test(context);
  }
};
var REMEDIATION_SITE_ID = {
  type: "REMEDIATION_SITE_ID",
  regex: /\b(?:REMEDIATION|CLEANUP)[-\s]?SITE[-\s]?(?:ID|NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[REMEDIATION_{n}]",
  priority: 80,
  severity: "low",
  description: "Remediation Site ID",
  validator: (_value, context) => {
    return /remediation|cleanup|site|superfund|brownfield|contamination/i.test(context);
  }
};
var ENVIRONMENTAL_CERTIFICATE = {
  type: "ENVIRONMENTAL_CERTIFICATE",
  regex: /\bENVIRONMENTAL[-\s]?(?:CERT(?:IFICATE)?|COMPLIANCE)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z0-9]{6,15})\b/gi,
  placeholder: "[ENV_CERT_{n}]",
  priority: 75,
  severity: "low",
  description: "Environmental Compliance Certificate",
  validator: (_value, context) => {
    return /environmental|compliance|certificate|permit|authorization/i.test(context);
  }
};
var environmentalPatterns = [
  EPA_ID_NUMBER,
  NPDES_PERMIT,
  HAZARDOUS_WASTE_MANIFEST,
  AIR_QUALITY_PERMIT,
  WATER_QUALITY_CERTIFICATE,
  STORM_WATER_PERMIT,
  UST_ID,
  FACILITY_ID,
  TRI_FACILITY_ID,
  SPILL_REPORT_NUMBER,
  REMEDIATION_SITE_ID,
  ENVIRONMENTAL_CERTIFICATE
];
var UAE_EMIRATES_ID = {
  type: "UAE_EMIRATES_ID",
  regex: /\b(784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d)\b/g,
  placeholder: "[UAE_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "UAE Emirates ID (15 digits starting with 784)",
  validator: (value, context) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 15 || !digits.startsWith("784")) return false;
    return /uae|emirates|dubai|abu[- ]?dhabi|national[- ]?id|emirates[- ]?id/i.test(context);
  }
};
var SAUDI_NATIONAL_ID = {
  type: "SAUDI_NATIONAL_ID",
  regex: /\b([12]\d{9})\b/g,
  placeholder: "[SA_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "Saudi Arabia National ID or Iqama (10 digits)",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    if (!/^[12]/.test(value)) return false;
    return /saudi|ksa|kingdom|iqama|national[- ]?id|muqeem/i.test(context);
  }
};
var ISRAEL_ID = {
  type: "ISRAEL_ID",
  regex: /\b(\d{9})\b/g,
  placeholder: "[IL_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "Israel Teudat Zehut ID number (9 digits with checksum)",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    return /israel|teudat|zehut|israeli|national[- ]?id/i.test(context);
  }
};
var TURKEY_ID = {
  type: "TURKEY_ID",
  regex: /\b([1-9]\d{10})\b/g,
  placeholder: "[TR_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "Turkey TC Kimlik No (11 digits with checksum)",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    if (value[0] === "0") return false;
    return /turkey|turkish|tc|kimlik|national[- ]?id/i.test(context);
  }
};
var QATAR_ID = {
  type: "QATAR_ID",
  regex: /\b(\d{11})\b/g,
  placeholder: "[QA_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Qatar ID (QID) - 11 digits",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    return /qatar|qid|doha|national[- ]?id|resident[- ]?permit/i.test(context);
  }
};
var KUWAIT_CIVIL_ID = {
  type: "KUWAIT_CIVIL_ID",
  regex: /\b(\d{12})\b/g,
  placeholder: "[KW_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Kuwait Civil ID (12 digits)",
  validator: (value, context) => {
    if (value.length !== 12) return false;
    if (!/kuwait|civil[- ]?id|national[- ]?id/i.test(context)) return false;
    const month = parseInt(value.substring(2, 4));
    const day = parseInt(value.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var BAHRAIN_CPR = {
  type: "BAHRAIN_CPR",
  regex: /\b(\d{9})\b/g,
  placeholder: "[BH_CPR_{n}]",
  priority: 85,
  severity: "high",
  description: "Bahrain CPR (Central Population Register) - 9 digits",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    if (!/bahrain|cpr|central[- ]?population|national[- ]?id/i.test(context)) return false;
    const month = parseInt(value.substring(2, 4));
    const day = parseInt(value.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var OMAN_CIVIL_ID = {
  type: "OMAN_CIVIL_ID",
  regex: /\b(\d{8})\b/g,
  placeholder: "[OM_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Oman Civil ID (8 digits)",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /oman|muscat|civil[- ]?id|national[- ]?id/i.test(context);
  }
};
var JORDAN_NATIONAL_ID = {
  type: "JORDAN_NATIONAL_ID",
  regex: /\b(\d{10})\b/g,
  placeholder: "[JO_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Jordan National ID (10 digits)",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    return /jordan|amman|national[- ]?id|jordanian/i.test(context);
  }
};
var LEBANON_NATIONAL_ID = {
  type: "LEBANON_NATIONAL_ID",
  regex: /\b(\d{7,8})\b/g,
  placeholder: "[LB_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Lebanon National ID (7-8 digits)",
  validator: (value, context) => {
    const length = value.length;
    if (length !== 7 && length !== 8) return false;
    return /lebanon|lebanese|beirut|national[- ]?id/i.test(context);
  }
};
var middleEastPatterns = [
  UAE_EMIRATES_ID,
  SAUDI_NATIONAL_ID,
  ISRAEL_ID,
  TURKEY_ID,
  QATAR_ID,
  KUWAIT_CIVIL_ID,
  BAHRAIN_CPR,
  OMAN_CIVIL_ID,
  JORDAN_NATIONAL_ID,
  LEBANON_NATIONAL_ID
];
var SOUTH_AFRICA_ID = {
  type: "SOUTH_AFRICA_ID",
  regex: /\b(\d{13})\b/g,
  placeholder: "[ZA_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "South African ID number (13 digits with date and checksum)",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!/south[- ]?africa|rsa|za|national[- ]?id|identity|id[- ]?number/i.test(context)) return false;
    const month = parseInt(value.substring(2, 4));
    const day = parseInt(value.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var NIGERIA_NIN = {
  type: "NIGERIA_NIN",
  regex: /\b(\d{11})\b/g,
  placeholder: "[NG_NIN_{n}]",
  priority: 95,
  severity: "high",
  description: "Nigeria National Identification Number (11 digits)",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    return /nigeria|nin|national[- ]?id|identity|nigerian/i.test(context);
  }
};
var NIGERIA_BVN = {
  type: "NIGERIA_BVN",
  regex: /\bBVN[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{11})\b/gi,
  placeholder: "[NG_BVN_{n}]",
  priority: 90,
  severity: "high",
  description: "Nigeria Bank Verification Number",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    return /bvn|bank[- ]?verification|nigeria|nigerian|banking/i.test(context);
  }
};
var KENYA_NATIONAL_ID = {
  type: "KENYA_NATIONAL_ID",
  regex: /\b(\d{7,8})\b/g,
  placeholder: "[KE_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Kenya National ID number (7-8 digits)",
  validator: (value, context) => {
    const length = value.length;
    if (length < 7 || length > 8) return false;
    return /kenya|kenyan|national[- ]?id|identity/i.test(context);
  }
};
var KENYA_KRA_PIN = {
  type: "KENYA_KRA_PIN",
  regex: /\b(A\d{9}[A-Z])\b/g,
  placeholder: "[KRA_PIN_{n}]",
  priority: 90,
  severity: "high",
  description: "Kenya Revenue Authority PIN (tax number)",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    if (!value.startsWith("A")) return false;
    return /kra|kenya|revenue|authority|tax|pin|taxpayer/i.test(context);
  }
};
var EGYPT_NATIONAL_ID = {
  type: "EGYPT_NATIONAL_ID",
  regex: /\b([12]\d{13})\b/g,
  placeholder: "[EG_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Egypt National ID (14 digits)",
  validator: (value, context) => {
    if (value.length !== 14) return false;
    if (!/egypt|egyptian|national[- ]?id|identity/i.test(context)) return false;
    const century = parseInt(value[0]);
    if (century !== 1 && century !== 2) return false;
    const month = parseInt(value.substring(5, 7));
    const day = parseInt(value.substring(7, 9));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var GHANA_CARD = {
  type: "GHANA_CARD",
  regex: /\b(GHA-\d{9}-\d)\b/g,
  placeholder: "[GH_CARD_{n}]",
  priority: 90,
  severity: "high",
  description: "Ghana Card national ID",
  validator: (value, context) => {
    if (value.length !== 15) return false;
    if (!value.startsWith("GHA-")) return false;
    return /ghana|ghanaian|ghana[- ]?card|national[- ]?id|identity/i.test(context);
  }
};
var MOROCCO_NATIONAL_ID = {
  type: "MOROCCO_NATIONAL_ID",
  regex: /\b(?:CNIE|ID)[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*([A-Z]{1,2}\d{6,8}|\d{8})\b/gi,
  placeholder: "[MA_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Morocco National ID (CNIE)",
  validator: (value, context) => {
    const length = value.length;
    if (length < 6 || length > 10) return false;
    return /morocco|moroccan|cnie|national[- ]?id|identity/i.test(context);
  }
};
var africaPatterns = [
  SOUTH_AFRICA_ID,
  NIGERIA_NIN,
  NIGERIA_BVN,
  KENYA_NATIONAL_ID,
  KENYA_KRA_PIN,
  EGYPT_NATIONAL_ID,
  GHANA_CARD,
  MOROCCO_NATIONAL_ID
];
var INDONESIA_NIK = {
  type: "INDONESIA_NIK",
  regex: /\b(\d{16})\b/g,
  placeholder: "[ID_NIK_{n}]",
  priority: 90,
  severity: "high",
  description: "Indonesia NIK (National ID number, 16 digits)",
  validator: (value, context) => {
    if (value.length !== 16) return false;
    return /indonesia|indonesian|nik|nomor[- ]?induk|ktp|national[- ]?id/i.test(context);
  }
};
var INDONESIA_NPWP = {
  type: "INDONESIA_NPWP",
  regex: /\b(\d{2}\.?\d{3}\.?\d{3}\.?\d[-\.]?\d{3}\.?\d{3})\b/g,
  placeholder: "[ID_NPWP_{n}]",
  priority: 90,
  severity: "high",
  description: "Indonesia NPWP (Tax ID number)",
  validator: (value, context) => {
    if (value.replace(/[.\-]/g, "").length !== 15) return false;
    return /indonesia|npwp|tax|pajak|wajib[- ]?pajak/i.test(context);
  }
};
var THAILAND_NATIONAL_ID = {
  type: "THAILAND_NATIONAL_ID",
  regex: /\b(\d{13})\b/g,
  placeholder: "[TH_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Thailand National ID (13 digits with checksum)",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    if (!/thailand|thai|national[- ]?id|บัตร|ประชาชน/i.test(context)) return false;
    const digits = value.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += digits[i] * (13 - i);
    return (11 - sum % 11) % 10 === digits[12];
  }
};
var MALAYSIA_MYKAD = {
  type: "MALAYSIA_MYKAD",
  regex: /\b(\d{6}[-\s]?\d{2}[-\s]?\d{4})\b/g,
  placeholder: "[MY_IC_{n}]",
  priority: 90,
  severity: "high",
  description: "Malaysia MyKad/IC number (12 digits)",
  validator: (value, context) => {
    const cleaned = value.replace(/[-\s]/g, "");
    if (cleaned.length !== 12) return false;
    if (!/malaysia|malaysian|mykad|ic[- ]?number|kad[- ]?pengenalan/i.test(context)) return false;
    const month = parseInt(cleaned.substring(2, 4));
    const day = parseInt(cleaned.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var PHILIPPINES_UMID = {
  type: "PHILIPPINES_UMID",
  regex: /\b(\d{4}[-\s]?\d{7}[-\s]?\d)\b/g,
  placeholder: "[PH_UMID_{n}]",
  priority: 85,
  severity: "high",
  description: "Philippines UMID number (12 digits)",
  validator: (value, context) => {
    if (value.replace(/[-\s]/g, "").length !== 12) return false;
    return /philippines|filipino|umid|unified|multipurpose|national[- ]?id/i.test(context);
  }
};
var VIETNAM_CCCD = {
  type: "VIETNAM_CCCD",
  regex: /\b(\d{12})\b/g,
  placeholder: "[VN_CCCD_{n}]",
  priority: 85,
  severity: "high",
  description: "Vietnam CCCD (Citizen Identity Card, 12 digits)",
  validator: (value, context) => {
    if (value.length !== 12) return false;
    return /vietnam|vietnamese|cccd|citizen[- ]?identity|cmnd|national[- ]?id/i.test(context);
  }
};
var MYANMAR_NRC = {
  type: "MYANMAR_NRC",
  regex: /\b(\d{1,2}\/[A-Z][a-z]+\([NC]\)\d{6})\b/g,
  placeholder: "[MM_NRC_{n}]",
  priority: 85,
  severity: "high",
  description: "Myanmar NRC (National Registration Card)",
  validator: (value, context) => {
    if (!/\([NC]\)/.test(value)) return false;
    return /myanmar|burmese|nrc|national[- ]?registration|identity/i.test(context);
  }
};
var southeastAsiaPatterns = [
  INDONESIA_NIK,
  INDONESIA_NPWP,
  THAILAND_NATIONAL_ID,
  MALAYSIA_MYKAD,
  PHILIPPINES_UMID,
  VIETNAM_CCCD,
  MYANMAR_NRC
];
var ARGENTINA_DNI = {
  type: "ARGENTINA_DNI",
  regex: /\b(\d{7,8})\b/g,
  placeholder: "[AR_DNI_{n}]",
  priority: 90,
  severity: "high",
  description: "Argentina National ID (DNI)",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 7 && len !== 8) return false;
    return /argentina|argentin|dni|documento\s?nacional|identidad/i.test(context);
  }
};
var ARGENTINA_CUIT = {
  type: "ARGENTINA_CUIT",
  regex: /\b(\d{2}-\d{8}-\d{1})\b/g,
  placeholder: "[AR_CUIT_{n}]",
  priority: 90,
  severity: "high",
  description: "Argentina CUIT/CUIL (Tax ID)",
  validator: (value, context) => {
    if (value.replace(/-/g, "").length !== 11) return false;
    return /argentina|cuit|cuil|tax|impuesto|tributario/i.test(context);
  }
};
var CHILE_RUT = {
  type: "CHILE_RUT",
  regex: /\b(\d{1,2}\.\d{3}\.\d{3}-[\dKk])\b/g,
  placeholder: "[CL_RUT_{n}]",
  priority: 95,
  severity: "high",
  description: "Chile RUT (National ID/Tax ID)",
  validator: (value, context) => {
    const clean = value.replace(/[.\-]/g, "");
    if (clean.length < 8 || clean.length > 9) return false;
    const body = clean.slice(0, -1);
    const checkDigit = clean.slice(-1).toUpperCase();
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = sum % 11;
    if (checkDigit !== (remainder === 0 ? "0" : remainder === 1 ? "K" : String(11 - remainder))) return false;
    return /chile|chilean|rut|rol\s?único|tributario|cédula/i.test(context);
  }
};
var COLOMBIA_CEDULA = {
  type: "COLOMBIA_CEDULA",
  regex: /\b(?:CC|CÉDULA|CEDULA)[-\s]?(?:NO|NUM)?[-\s]?[:#]?\s*(\d{6,10})\b/gi,
  placeholder: "[CO_CC_{n}]",
  priority: 90,
  severity: "high",
  description: "Colombia C\xE9dula de Ciudadan\xEDa",
  validator: (value, context) => {
    const len = value.length;
    if (len < 6 || len > 10) return false;
    return /colombia|colombian|cédula|cedula|ciudadanía|cc\s/i.test(context);
  }
};
var COLOMBIA_NIT = {
  type: "COLOMBIA_NIT",
  regex: /\bNIT[-\s]?(?:NO|NUM)?[-\s]?[:#]?\s*(\d{9}-\d{1})\b/gi,
  placeholder: "[CO_NIT_{n}]",
  priority: 85,
  severity: "high",
  description: "Colombia NIT (Tax ID)",
  validator: (value, context) => {
    if (value.replace(/-/g, "").length !== 10) return false;
    return /colombia|nit|tax|impuesto|tributario|empresa/i.test(context);
  }
};
var PERU_DNI = {
  type: "PERU_DNI",
  regex: /\b(\d{8})\b/g,
  placeholder: "[PE_DNI_{n}]",
  priority: 90,
  severity: "high",
  description: "Peru National ID (DNI)",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /peru|peruvian|perú|peruano|dni|documento\s?nacional|identidad|reniec/i.test(context);
  }
};
var PERU_RUC = {
  type: "PERU_RUC",
  regex: /\bRUC[-\s]?(?:NO|NUM)?[-\s]?[:#]?\s*(\d{11})\b/gi,
  placeholder: "[PE_RUC_{n}]",
  priority: 90,
  severity: "high",
  description: "Peru RUC (Tax ID)",
  validator: (value, context) => {
    if (value.length !== 11) return false;
    const prefix = value.substring(0, 2);
    if (![
      "10",
      "15",
      "17",
      "20"
    ].includes(prefix)) return false;
    return /peru|perú|ruc|tax|sunat|tributario/i.test(context);
  }
};
var VENEZUELA_CEDULA = {
  type: "VENEZUELA_CEDULA",
  regex: /\b([VE]-\d{1,8})\b/gi,
  placeholder: "[VE_CI_{n}]",
  priority: 90,
  severity: "high",
  description: "Venezuela C\xE9dula de Identidad",
  validator: (value, context) => {
    if (!value.toUpperCase().startsWith("V-") && !value.toUpperCase().startsWith("E-")) return false;
    return /venezuela|venezuelan|cédula|cedula|identidad|ci\s/i.test(context);
  }
};
var VENEZUELA_RIF = {
  type: "VENEZUELA_RIF",
  regex: /\b([VEJG]-\d{8,9}-\d{1})\b/gi,
  placeholder: "[VE_RIF_{n}]",
  priority: 90,
  severity: "high",
  description: "Venezuela RIF (Tax ID)",
  validator: (value, context) => {
    const prefix = value[0].toUpperCase();
    if (![
      "V",
      "E",
      "J",
      "G"
    ].includes(prefix)) return false;
    return /venezuela|rif|tax|seniat|tributario/i.test(context);
  }
};
var ECUADOR_CEDULA = {
  type: "ECUADOR_CEDULA",
  regex: /\b(\d{10})\b/g,
  placeholder: "[EC_CI_{n}]",
  priority: 90,
  severity: "high",
  description: "Ecuador C\xE9dula de Identidad",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    const province = parseInt(value.substring(0, 2));
    if (province < 1 || province > 24) return false;
    const thirdDigit = parseInt(value[2]);
    if (thirdDigit > 6 && thirdDigit !== 9) return false;
    return /ecuador|ecuadorian|cédula|cedula|identidad/i.test(context);
  }
};
var URUGUAY_CEDULA = {
  type: "URUGUAY_CEDULA",
  regex: /\b(\d{1}\.\d{3}\.\d{3}-\d{1})\b/g,
  placeholder: "[UY_CI_{n}]",
  priority: 90,
  severity: "high",
  description: "Uruguay C\xE9dula de Identidad",
  validator: (value, context) => {
    if (value.replace(/[.\-]/g, "").length !== 8) return false;
    return /uruguay|uruguayan|cédula|cedula|identidad/i.test(context);
  }
};
var latinAmericaPatterns = [
  ARGENTINA_DNI,
  ARGENTINA_CUIT,
  CHILE_RUT,
  COLOMBIA_CEDULA,
  COLOMBIA_NIT,
  PERU_DNI,
  PERU_RUC,
  VENEZUELA_CEDULA,
  VENEZUELA_RIF,
  ECUADOR_CEDULA,
  URUGUAY_CEDULA
];
var RUSSIAN_PASSPORT = {
  type: "RUSSIAN_PASSPORT",
  regex: /\b(\d{4}\s?\d{6})\b/g,
  placeholder: "[RU_PASSPORT_{n}]",
  priority: 90,
  severity: "high",
  description: "Russian Passport Number",
  validator: (value, context) => {
    if (value.replace(/\s/g, "").length !== 10) return false;
    return /russia|russian|passport|паспорт|российский/i.test(context);
  }
};
var RUSSIAN_SNILS = {
  type: "RUSSIAN_SNILS",
  regex: /\b(\d{3}-\d{3}-\d{3}\s?\d{2})\b/g,
  placeholder: "[RU_SNILS_{n}]",
  priority: 90,
  severity: "high",
  description: "Russian SNILS (Pension Fund Number)",
  validator: (value, context) => {
    if (value.replace(/[-\s]/g, "").length !== 11) return false;
    return /russia|russian|snils|снилс|pension|пенсионный/i.test(context);
  }
};
var UKRAINIAN_PASSPORT = {
  type: "UKRAINIAN_PASSPORT",
  regex: /\b([A-Z]{2}\d{6})\b/g,
  placeholder: "[UA_PASSPORT_{n}]",
  priority: 90,
  severity: "high",
  description: "Ukrainian Passport Number",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /ukrain|passport|паспорт|український/i.test(context);
  }
};
var UKRAINIAN_INN = {
  type: "UKRAINIAN_INN",
  regex: /\bINN[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{10})\b/gi,
  placeholder: "[UA_INN_{n}]",
  priority: 90,
  severity: "high",
  description: "Ukrainian Tax ID (INN)",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    return /ukrain|inn|tax|податковий|інн/i.test(context);
  }
};
var CZECH_NATIONAL_ID = {
  type: "CZECH_NATIONAL_ID",
  regex: /\b(\d{6}\/\d{4})\b/g,
  placeholder: "[CZ_ID_{n}]",
  priority: 95,
  severity: "high",
  description: "Czech Republic National ID (Rodn\xE9 \u010D\xEDslo)",
  validator: (value, context) => {
    const parts = value.split("/");
    if (parts.length !== 2) return false;
    const datepart = parts[0];
    const serial = parts[1];
    if (datepart.length !== 6 || serial.length !== 4) return false;
    const month = parseInt(datepart.substring(2, 4));
    const day = parseInt(datepart.substring(4, 6));
    const adjustedMonth = month > 50 ? month - 50 : month;
    if (adjustedMonth < 1 || adjustedMonth > 12) return false;
    if (day < 1 || day > 31) return false;
    return /czech|czechia|republic|rodné|číslo|national\s?id/i.test(context);
  }
};
var ROMANIAN_CNP = {
  type: "ROMANIAN_CNP",
  regex: /\bCNP[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{13})\b/gi,
  placeholder: "[RO_CNP_{n}]",
  priority: 95,
  severity: "high",
  description: "Romanian Personal Numeric Code (CNP)",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    const firstDigit = parseInt(value[0]);
    if (firstDigit < 1 || firstDigit > 9) return false;
    const month = parseInt(value.substring(3, 5));
    const day = parseInt(value.substring(5, 7));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return /romania|romanian|cnp|cod\s?numeric|personal/i.test(context);
  }
};
var HUNGARIAN_PERSONAL_ID = {
  type: "HUNGARIAN_PERSONAL_ID",
  regex: /\b(\d{6}[A-Z]{2})\b/g,
  placeholder: "[HU_ID_{n}]",
  priority: 90,
  severity: "high",
  description: "Hungarian Personal ID",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /hungar|magyar|személyi|igazolvány|personal\s?id/i.test(context);
  }
};
var HUNGARIAN_TAX_ID = {
  type: "HUNGARIAN_TAX_ID",
  regex: /\b(\d{10})\b/g,
  placeholder: "[HU_TAX_{n}]",
  priority: 85,
  severity: "high",
  description: "Hungarian Tax ID (Ad\xF3azonos\xEDt\xF3 jel)",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    return /hungar|magyar|adó|tax|adóazonosító/i.test(context);
  }
};
var BULGARIAN_PERSONAL_NUMBER = {
  type: "BULGARIAN_PERSONAL_NUMBER",
  regex: /\b(\d{10})\b/g,
  placeholder: "[BG_EGN_{n}]",
  priority: 90,
  severity: "high",
  description: "Bulgarian Personal Number (EGN)",
  validator: (value, context) => {
    if (value.length !== 10) return false;
    const month = parseInt(value.substring(2, 4));
    const day = parseInt(value.substring(4, 6));
    const adjustedMonth = month > 40 ? month - 40 : month > 20 ? month - 20 : month;
    if (adjustedMonth < 1 || adjustedMonth > 12) return false;
    if (day < 1 || day > 31) return false;
    return /bulgaria|bulgarian|егн|personal\s?number|единен/i.test(context);
  }
};
var SERBIAN_JMBG = {
  type: "SERBIAN_JMBG",
  regex: /\b(\d{13})\b/g,
  placeholder: "[RS_JMBG_{n}]",
  priority: 90,
  severity: "high",
  description: "Serbian Personal ID (JMBG)",
  validator: (value, context) => {
    if (value.length !== 13) return false;
    const day = parseInt(value.substring(0, 2));
    const month = parseInt(value.substring(2, 4));
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    return /serb|serbia|jmbg|jedinstveni|matični|personal/i.test(context);
  }
};
var easternEuropePatterns = [
  RUSSIAN_PASSPORT,
  RUSSIAN_SNILS,
  UKRAINIAN_PASSPORT,
  UKRAINIAN_INN,
  CZECH_NATIONAL_ID,
  ROMANIAN_CNP,
  HUNGARIAN_PERSONAL_ID,
  HUNGARIAN_TAX_ID,
  BULGARIAN_PERSONAL_NUMBER,
  SERBIAN_JMBG
];
var NEW_ZEALAND_DRIVER_LICENSE = {
  type: "NEW_ZEALAND_DRIVER_LICENSE",
  regex: /\b([A-Z]{2}\d{6})\b/g,
  placeholder: "[NZ_DL_{n}]",
  priority: 90,
  severity: "high",
  description: "New Zealand Driver License Number",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /new\s?zealand|nz|kiwi|driver|license|licence/i.test(context);
  }
};
var NEW_ZEALAND_IRD = {
  type: "NEW_ZEALAND_IRD",
  regex: /\bIRD[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{8,9})\b/gi,
  placeholder: "[NZ_IRD_{n}]",
  priority: 90,
  severity: "high",
  description: "New Zealand IRD Number (Tax ID)",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 8 && len !== 9) return false;
    return /new\s?zealand|nz|ird|tax|inland\s?revenue/i.test(context);
  }
};
var NEW_ZEALAND_PASSPORT = {
  type: "NEW_ZEALAND_PASSPORT",
  regex: /\b([A-Z]{2}\d{6})\b/g,
  placeholder: "[NZ_PASSPORT_{n}]",
  priority: 85,
  severity: "high",
  description: "New Zealand Passport Number",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /new\s?zealand|nz|passport|travel\s?document/i.test(context);
  }
};
var FIJI_NATIONAL_ID = {
  type: "FIJI_NATIONAL_ID",
  regex: /\b(?:FIJI|FJ)[-\s]?(?:ID|NATIONAL\s?ID)[-\s]?[:#]?\s*([A-Z0-9]{8,10})\b/gi,
  placeholder: "[FJ_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Fiji National ID",
  validator: (_value, context) => {
    return /fiji|fijian|national\s?id|identity/i.test(context);
  }
};
var PNG_NATIONAL_ID = {
  type: "PNG_NATIONAL_ID",
  regex: /\b(?:PNG|PAPUA)[-\s]?(?:ID|NATIONAL\s?ID)[-\s]?[:#]?\s*([A-Z0-9]{8,12})\b/gi,
  placeholder: "[PNG_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Papua New Guinea National ID",
  validator: (_value, context) => {
    return /papua|png|new\s?guinea|national\s?id|identity/i.test(context);
  }
};
var SAMOA_NATIONAL_ID = {
  type: "SAMOA_NATIONAL_ID",
  regex: /\b(?:SAMOA|WS)[-\s]?(?:ID|NATIONAL\s?ID)[-\s]?[:#]?\s*(\d{8,10})\b/gi,
  placeholder: "[WS_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Samoa National ID",
  validator: (_value, context) => {
    return /samoa|samoan|national\s?id|identity/i.test(context);
  }
};
var TONGA_NATIONAL_ID = {
  type: "TONGA_NATIONAL_ID",
  regex: /\b(?:TONGA|TO)[-\s]?(?:ID|NATIONAL\s?ID)[-\s]?[:#]?\s*([A-Z0-9]{8,10})\b/gi,
  placeholder: "[TO_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Tonga National ID",
  validator: (_value, context) => {
    return /tonga|tongan|national\s?id|identity/i.test(context);
  }
};
var oceaniaPatterns = [
  NEW_ZEALAND_DRIVER_LICENSE,
  NEW_ZEALAND_IRD,
  NEW_ZEALAND_PASSPORT,
  FIJI_NATIONAL_ID,
  PNG_NATIONAL_ID,
  SAMOA_NATIONAL_ID,
  TONGA_NATIONAL_ID
];
var KAZAKHSTAN_IIN = {
  type: "KAZAKHSTAN_IIN",
  regex: /\bIIN[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{12})\b/gi,
  placeholder: "[KZ_IIN_{n}]",
  priority: 90,
  severity: "high",
  description: "Kazakhstan Individual Identification Number (IIN)",
  validator: (value, context) => {
    if (value.length !== 12) return false;
    parseInt(value.substring(0, 2));
    const month = parseInt(value.substring(2, 4));
    const day = parseInt(value.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return /kazakh|kazakhstan|iin|жсн|individual\s?identification/i.test(context);
  }
};
var UZBEKISTAN_PASSPORT = {
  type: "UZBEKISTAN_PASSPORT",
  regex: /\b([A-Z]{2}\d{7})\b/g,
  placeholder: "[UZ_PASSPORT_{n}]",
  priority: 90,
  severity: "high",
  description: "Uzbekistan Passport Number",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    return /uzbek|uzbekistan|passport|pasport/i.test(context);
  }
};
var UZBEKISTAN_STIR = {
  type: "UZBEKISTAN_STIR",
  regex: /\bSTIR[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{9})\b/gi,
  placeholder: "[UZ_STIR_{n}]",
  priority: 90,
  severity: "high",
  description: "Uzbekistan Tax ID (STIR)",
  validator: (value, context) => {
    if (value.length !== 9) return false;
    return /uzbek|uzbekistan|stir|tax|inn|soliq/i.test(context);
  }
};
var KYRGYZSTAN_PIN = {
  type: "KYRGYZSTAN_PIN",
  regex: /\bPIN[-\s]?(?:NO|NUM|NUMBER)?[-\s]?[:#]?\s*(\d{14})\b/gi,
  placeholder: "[KG_PIN_{n}]",
  priority: 90,
  severity: "high",
  description: "Kyrgyzstan Personal ID Number (PIN)",
  validator: (value, context) => {
    if (value.length !== 14) return false;
    return /kyrgyz|kyrgyzstan|pin|личный|номер/i.test(context);
  }
};
var TAJIKISTAN_NATIONAL_ID = {
  type: "TAJIKISTAN_NATIONAL_ID",
  regex: /\b(?:TAJIK|TJ)[-\s]?(?:ID|NATIONAL\s?ID)[-\s]?[:#]?\s*(\d{9,10})\b/gi,
  placeholder: "[TJ_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "Tajikistan National ID",
  validator: (value, context) => {
    const len = value.length;
    if (len !== 9 && len !== 10) return false;
    return /tajik|tajikistan|national\s?id|identity/i.test(context);
  }
};
var TURKMENISTAN_PASSPORT = {
  type: "TURKMENISTAN_PASSPORT",
  regex: /\b([A-Z]\d{7})\b/g,
  placeholder: "[TM_PASSPORT_{n}]",
  priority: 90,
  severity: "high",
  description: "Turkmenistan Passport Number",
  validator: (value, context) => {
    if (value.length !== 8) return false;
    return /turkmen|turkmenistan|passport|pasport/i.test(context);
  }
};
var centralAsiaPatterns = [
  KAZAKHSTAN_IIN,
  UZBEKISTAN_PASSPORT,
  UZBEKISTAN_STIR,
  KYRGYZSTAN_PIN,
  TAJIKISTAN_NATIONAL_ID,
  TURKMENISTAN_PASSPORT
];
var GERMAN_TAX_ID = {
  type: "GERMAN_TAX_ID",
  regex: /\b(\d{11})\b/g,
  placeholder: "[DE_TAX_ID_{n}]",
  priority: 85,
  severity: "high",
  description: "German Tax Identification Number (Steueridentifikationsnummer)",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!/^\d{11}$/.test(cleaned)) return false;
    if (!/steuer|tax|german|deutschland|finanzamt/i.test(context)) return false;
    const digits = cleaned.split("").map(Number);
    const digitCounts = /* @__PURE__ */ new Map();
    digits.forEach((d) => digitCounts.set(d, (digitCounts.get(d) || 0) + 1));
    const counts = Array.from(digitCounts.values());
    const hasDoubleOrTriple = counts.some((c) => c === 2 || c === 3);
    const noQuadruple = counts.every((c) => c <= 3);
    return hasDoubleOrTriple && noQuadruple;
  }
};
var FRENCH_SOCIAL_SECURITY = {
  type: "FRENCH_SOCIAL_SECURITY",
  regex: /\b([12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2})\b/g,
  placeholder: "[FR_SSN_{n}]",
  priority: 90,
  severity: "high",
  description: "French Social Security Number",
  validator: (value, _context) => {
    const cleaned = value.replace(/\s/g, "");
    if (!/^[12]/.test(cleaned)) return false;
    if (parseInt(cleaned.substring(1, 3)) > 99) return false;
    const month = parseInt(cleaned.substring(3, 5));
    if (month < 1 || month > 20) return false;
    return true;
  }
};
var SPANISH_DNI = {
  type: "SPANISH_DNI",
  regex: /\b([0-9]{8}[-\s]?[A-Z]|[XYZ][-\s]?[0-9]{7}[-\s]?[A-Z])\b/gi,
  placeholder: "[ES_DNI_{n}]",
  priority: 90,
  severity: "high",
  description: "Spanish National ID (DNI) or Foreigner ID (NIE)",
  validator: (value, _context) => {
    const cleaned = value.replace(/[-\s]/g, "").toUpperCase();
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    let numbers;
    let letter;
    if (/^[XYZ]/.test(cleaned)) {
      numbers = cleaned.substring(1, 8);
      letter = cleaned[8];
      numbers = (cleaned[0] === "X" ? "0" : cleaned[0] === "Y" ? "1" : "2") + numbers;
    } else {
      numbers = cleaned.substring(0, 8);
      letter = cleaned[8];
    }
    const expectedLetter = letters[parseInt(numbers) % 23];
    return letter === expectedLetter;
  }
};
var ITALIAN_FISCAL_CODE = {
  type: "ITALIAN_FISCAL_CODE",
  regex: /\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/gi,
  placeholder: "[IT_CF_{n}]",
  priority: 90,
  severity: "high",
  description: "Italian Fiscal Code (Codice Fiscale)",
  validator: (value, _context) => {
    const code = value.toUpperCase();
    const monthCode = code[8];
    if (!"ABCDEHLMPRST".includes(monthCode)) return false;
    const day = parseInt(code.substring(9, 11));
    if ((day < 1 || day > 31) && (day < 41 || day > 71)) return false;
    const oddMap = {
      "0": 1,
      "1": 0,
      "2": 5,
      "3": 7,
      "4": 9,
      "5": 13,
      "6": 15,
      "7": 17,
      "8": 19,
      "9": 21,
      "A": 1,
      "B": 0,
      "C": 5,
      "D": 7,
      "E": 9,
      "F": 13,
      "G": 15,
      "H": 17,
      "I": 19,
      "J": 21,
      "K": 2,
      "L": 4,
      "M": 18,
      "N": 20,
      "O": 11,
      "P": 3,
      "Q": 6,
      "R": 8,
      "S": 12,
      "T": 14,
      "U": 16,
      "V": 10,
      "W": 22,
      "X": 25,
      "Y": 24,
      "Z": 23
    };
    const evenMap = {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "A": 0,
      "B": 1,
      "C": 2,
      "D": 3,
      "E": 4,
      "F": 5,
      "G": 6,
      "H": 7,
      "I": 8,
      "J": 9,
      "K": 10,
      "L": 11,
      "M": 12,
      "N": 13,
      "O": 14,
      "P": 15,
      "Q": 16,
      "R": 17,
      "S": 18,
      "T": 19,
      "U": 20,
      "V": 21,
      "W": 22,
      "X": 23,
      "Y": 24,
      "Z": 25
    };
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const char = code[i];
      sum += i % 2 === 0 ? oddMap[char] : evenMap[char];
    }
    return String.fromCharCode(65 + sum % 26) === code[15];
  }
};
var DUTCH_BSN = {
  type: "DUTCH_BSN",
  regex: /\b(\d{9})\b/g,
  placeholder: "[NL_BSN_{n}]",
  priority: 90,
  severity: "high",
  description: "Dutch Citizen Service Number (BSN)",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!/^\d{9}$/.test(cleaned)) return false;
    if (!/bsn|dutch|netherlands|nederland|burger/i.test(context)) return false;
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += digits[i] * (9 - i);
    sum -= digits[8];
    return sum % 11 === 0;
  }
};
var POLISH_PESEL = {
  type: "POLISH_PESEL",
  regex: /\b(\d{11})\b/g,
  placeholder: "[PL_PESEL_{n}]",
  priority: 90,
  severity: "high",
  description: "Polish National Identification Number (PESEL)",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!/^\d{11}$/.test(cleaned)) return false;
    if (!/pesel|polish|poland|polska/i.test(context)) return false;
    const weights = [
      1,
      3,
      7,
      9,
      1,
      3,
      7,
      9,
      1,
      3
    ];
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * weights[i];
    return (10 - sum % 10) % 10 === digits[10];
  }
};
var INDIAN_AADHAAR = {
  type: "INDIAN_AADHAAR",
  regex: /\b(\d{4}\s?\d{4}\s?\d{4})\b/g,
  placeholder: "[IN_AADHAAR_{n}]",
  priority: 95,
  severity: "high",
  description: "Indian Aadhaar Number",
  validator: (value, context) => {
    const cleaned = value.replace(/\s/g, "");
    if (!/aadhaar|aadhar|india|indian|uid/i.test(context)) return false;
    return cleaned.length === 12 && /^\d{12}$/.test(cleaned);
  }
};
var AUSTRALIAN_MEDICARE = {
  type: "AUSTRALIAN_MEDICARE",
  regex: /\b([2-6]\d{3}\s?\d{5}\s?\d)\b/g,
  placeholder: "[AU_MEDICARE_{n}]",
  priority: 90,
  severity: "high",
  description: "Australian Medicare Number",
  validator: (value, _context) => {
    const cleaned = value.replace(/\s/g, "");
    if (!/^[2-6]/.test(cleaned)) return false;
    const weights = [
      1,
      3,
      7,
      9,
      1,
      3,
      7,
      9
    ];
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += digits[i] * weights[i];
    return sum % 10 === digits[8];
  }
};
var AUSTRALIAN_TFN = {
  type: "AUSTRALIAN_TFN",
  regex: /\b(\d{3}\s?\d{3}\s?\d{3})\b/g,
  placeholder: "[AU_TFN_{n}]",
  priority: 95,
  severity: "high",
  description: "Australian Tax File Number",
  validator: (value, context) => {
    const cleaned = value.replace(/\s/g, "");
    if (!/tfn|tax.file|australian|australia/i.test(context)) return false;
    const weights = [
      1,
      4,
      3,
      7,
      5,
      8,
      6,
      9,
      10
    ];
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * weights[i];
    return sum % 11 === 0;
  }
};
var SINGAPORE_NRIC = {
  type: "SINGAPORE_NRIC",
  regex: /\b([STFGM]\d{7}[A-Z])\b/gi,
  placeholder: "[SG_NRIC_{n}]",
  priority: 90,
  severity: "high",
  description: "Singapore NRIC/FIN",
  validator: (value, _context) => {
    const code = value.toUpperCase();
    const prefix = code[0];
    const digits = code.substring(1, 8).split("").map(Number);
    const checkLetter = code[8];
    const weights = [
      2,
      7,
      6,
      5,
      4,
      3,
      2
    ];
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += digits[i] * weights[i];
    const stLetters = "JZIHGFEDCBA";
    const fgLetters = "XWUTRQPNMLK";
    const mLetters = "KMLKJIHGFEDCBA";
    let expectedLetter;
    if (prefix === "S" || prefix === "T") expectedLetter = stLetters[sum % 11];
    else if (prefix === "F" || prefix === "G") expectedLetter = fgLetters[sum % 11];
    else expectedLetter = mLetters[sum % 11];
    return checkLetter === expectedLetter;
  }
};
var JAPANESE_MY_NUMBER = {
  type: "JAPANESE_MY_NUMBER",
  regex: /\b(\d{4}\s?\d{4}\s?\d{4})\b/g,
  placeholder: "[JP_MY_NUMBER_{n}]",
  priority: 95,
  severity: "high",
  description: "Japanese My Number",
  validator: (value, context) => {
    const cleaned = value.replace(/\s/g, "");
    if (!/my.number|japan|japanese|マイナンバー/i.test(context)) return false;
    const digits = cleaned.split("").map(Number);
    const weights = [
      1,
      2,
      1,
      2,
      1,
      2,
      1,
      2,
      1,
      2,
      1
    ];
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      let product = digits[i] * weights[i];
      sum += Math.floor(product / 10) + product % 10;
    }
    return (10 - sum % 10) % 10 === digits[11];
  }
};
var SOUTH_KOREAN_RRN = {
  type: "SOUTH_KOREAN_RRN",
  regex: /\b(\d{6}[-\s]?[1-4]\d{6})\b/g,
  placeholder: "[KR_RRN_{n}]",
  priority: 95,
  severity: "high",
  description: "South Korean Resident Registration Number",
  validator: (value, context) => {
    const cleaned = value.replace(/[-\s]/g, "");
    if (!/rrn|korean|korea|주민등록번호/i.test(context)) return false;
    const genderDigit = parseInt(cleaned[6]);
    if (genderDigit < 1 || genderDigit > 4) return false;
    const weights = [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      2,
      3,
      4,
      5
    ];
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += digits[i] * weights[i];
    return (11 - sum % 11) % 10 === digits[12];
  }
};
var CANADIAN_SIN = {
  type: "CANADIAN_SIN",
  regex: /\b(\d{3}[-\s]?\d{3}[-\s]?\d{3})\b/g,
  placeholder: "[CA_SIN_{n}]",
  priority: 95,
  severity: "high",
  description: "Canadian Social Insurance Number",
  validator: (value, context) => {
    const cleaned = value.replace(/[-\s]/g, "");
    if (!/sin|social.insurance|canadian|canada/i.test(context)) return false;
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }
};
var BRAZILIAN_CPF = {
  type: "BRAZILIAN_CPF",
  regex: /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,
  placeholder: "[BR_CPF_{n}]",
  priority: 90,
  severity: "high",
  description: "Brazilian CPF (Individual Taxpayer ID)",
  validator: (value, _context) => {
    const digits = value.replace(/[.\-]/g, "").split("").map(Number);
    if (new Set(digits).size === 1) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
    let check1 = 11 - sum % 11;
    if (check1 >= 10) check1 = 0;
    if (check1 !== digits[9]) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
    let check2 = 11 - sum % 11;
    if (check2 >= 10) check2 = 0;
    return check2 === digits[10];
  }
};
var BRAZILIAN_CNPJ = {
  type: "BRAZILIAN_CNPJ",
  regex: /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g,
  placeholder: "[BR_CNPJ_{n}]",
  priority: 85,
  severity: "high",
  description: "Brazilian CNPJ (Company Tax ID)",
  validator: (value, _context) => {
    const digits = value.replace(/[.\-\/]/g, "").split("").map(Number);
    const weights1 = [
      5,
      4,
      3,
      2,
      9,
      8,
      7,
      6,
      5,
      4,
      3,
      2
    ];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += digits[i] * weights1[i];
    let check1 = sum % 11;
    check1 = check1 < 2 ? 0 : 11 - check1;
    if (check1 !== digits[12]) return false;
    const weights2 = [
      6,
      5,
      4,
      3,
      2,
      9,
      8,
      7,
      6,
      5,
      4,
      3,
      2
    ];
    sum = 0;
    for (let i = 0; i < 13; i++) sum += digits[i] * weights2[i];
    let check2 = sum % 11;
    check2 = check2 < 2 ? 0 : 11 - check2;
    return check2 === digits[13];
  }
};
var MEXICAN_CURP = {
  type: "MEXICAN_CURP",
  regex: /\b([A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d)\b/gi,
  placeholder: "[MX_CURP_{n}]",
  priority: 90,
  severity: "high",
  description: "Mexican CURP (Population Registry Code)",
  validator: (value, _context) => {
    const curp = value.toUpperCase();
    const gender = curp[10];
    if (gender !== "H" && gender !== "M") return false;
    const validStates = [
      "AS",
      "BC",
      "BS",
      "CC",
      "CL",
      "CM",
      "CS",
      "CH",
      "DF",
      "DG",
      "GT",
      "GR",
      "HG",
      "JC",
      "MC",
      "MN",
      "MS",
      "NT",
      "NL",
      "OC",
      "PL",
      "QT",
      "QR",
      "SP",
      "SL",
      "SR",
      "TC",
      "TS",
      "TL",
      "VZ",
      "YN",
      "ZS",
      "NE"
    ];
    const stateCode = curp.substring(11, 13);
    return validStates.includes(stateCode);
  }
};
var MEXICAN_RFC = {
  type: "MEXICAN_RFC",
  regex: /\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{2,3})\b/gi,
  placeholder: "[MX_RFC_{n}]",
  priority: 90,
  severity: "high",
  description: "Mexican RFC (Tax ID)",
  validator: (value, context) => {
    const rfc = value.toUpperCase();
    if (!/rfc|mexican|mexico|impuesto|contribuyente/i.test(context)) return false;
    if (rfc.length !== 12 && rfc.length !== 13) return false;
    const month = parseInt(rfc.substring(6, 8));
    const day = parseInt(rfc.substring(8, 10));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
};
var internationalPatterns = [
  GERMAN_TAX_ID,
  FRENCH_SOCIAL_SECURITY,
  SPANISH_DNI,
  ITALIAN_FISCAL_CODE,
  DUTCH_BSN,
  POLISH_PESEL,
  INDIAN_AADHAAR,
  AUSTRALIAN_MEDICARE,
  AUSTRALIAN_TFN,
  SINGAPORE_NRIC,
  JAPANESE_MY_NUMBER,
  SOUTH_KOREAN_RRN,
  CANADIAN_SIN,
  BRAZILIAN_CPF,
  BRAZILIAN_CNPJ,
  MEXICAN_CURP,
  MEXICAN_RFC,
  ...middleEastPatterns,
  ...africaPatterns,
  ...southeastAsiaPatterns,
  ...latinAmericaPatterns,
  ...easternEuropePatterns,
  ...oceaniaPatterns,
  ...centralAsiaPatterns
];
var DISCORD_USER_ID = {
  type: "DISCORD_USER_ID",
  regex: /\b(\d{17,19})\b/g,
  placeholder: "[DISCORD_ID_{n}]",
  priority: 85,
  severity: "medium",
  description: "Discord user ID (Snowflake format)",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (cleaned.length < 17 || cleaned.length > 19) return false;
    return /discord|snowflake|user[-_]?id|server|guild/i.test(context);
  }
};
var STEAM_ID64 = {
  type: "STEAM_ID64",
  regex: /\b(765\d{14})\b/g,
  placeholder: "[STEAM_ID_{n}]",
  priority: 85,
  severity: "medium",
  description: "Steam 64-bit user ID",
  validator: (value, context) => {
    const cleaned = value.replace(/[\s\u00A0.-]/g, "");
    if (!cleaned.startsWith("765") || cleaned.length !== 17) return false;
    return /steam|gaming|player|profile|valve|community/i.test(context);
  }
};
var SOCIAL_MEDIA_HANDLE = {
  type: "SOCIAL_MEDIA_HANDLE",
  regex: /@([a-zA-Z0-9_]{3,30})\b/g,
  placeholder: "[@HANDLE_{n}]",
  priority: 75,
  severity: "medium",
  description: "Social media handle/username",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 30) return false;
    return /twitter|instagram|tiktok|social|handle|profile|mention|tag/i.test(context);
  }
};
var TWITTER_USER_ID = {
  type: "TWITTER_USER_ID",
  regex: /\b(\d{5,19})\b/g,
  placeholder: "[TWITTER_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Twitter/X numeric user ID",
  validator: (value, context) => {
    const length = value.length;
    if (length < 5 || length > 19) return false;
    return /twitter|tweet|@|user[-_]?id|x\.com/i.test(context);
  }
};
var FACEBOOK_ID = {
  type: "FACEBOOK_ID",
  regex: /\b(\d{15,17})\b/g,
  placeholder: "[FB_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Facebook numeric profile ID",
  validator: (value, context) => {
    const length = value.length;
    if (length < 15 || length > 17) return false;
    return /facebook|fb|profile|meta|user[-_]?id/i.test(context);
  }
};
var INSTAGRAM_USERNAME = {
  type: "INSTAGRAM_USERNAME",
  regex: /\b([a-zA-Z0-9._]{3,30})\b/g,
  placeholder: "[IG_USER_{n}]",
  priority: 70,
  severity: "medium",
  description: "Instagram username",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 30) return false;
    if (!/^[a-zA-Z0-9._]+$/.test(value)) return false;
    return /instagram|ig|insta|profile|handle|username|follow/i.test(context);
  }
};
var TIKTOK_USERNAME = {
  type: "TIKTOK_USERNAME",
  regex: /@([a-zA-Z0-9._]{2,24})\b/g,
  placeholder: "[@TIKTOK_{n}]",
  priority: 75,
  severity: "medium",
  description: "TikTok username",
  validator: (value, context) => {
    if (value.length < 2 || value.length > 24) return false;
    return /tiktok|tt|video|profile|creator/i.test(context);
  }
};
var LINKEDIN_PROFILE = {
  type: "LINKEDIN_PROFILE",
  regex: /\/in\/([a-zA-Z0-9-]{3,100})\/?/g,
  placeholder: "[LINKEDIN_{n}]",
  priority: 80,
  severity: "medium",
  description: "LinkedIn profile URL identifier",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 100) return false;
    return /linkedin|profile|professional|connection|network/i.test(context);
  }
};
var YOUTUBE_CHANNEL_ID = {
  type: "YOUTUBE_CHANNEL_ID",
  regex: /\b(UC[a-zA-Z0-9_-]{22})\b/g,
  placeholder: "[YT_CHANNEL_{n}]",
  priority: 75,
  severity: "low",
  description: "YouTube channel ID",
  validator: (value, context) => {
    if (!value.startsWith("UC") || value.length !== 24) return false;
    return /youtube|yt|channel|video|creator|subscriber/i.test(context);
  }
};
var REDDIT_USERNAME = {
  type: "REDDIT_USERNAME",
  regex: /u\/([a-zA-Z0-9_-]{3,20})\b/g,
  placeholder: "[REDDIT_{n}]",
  priority: 75,
  severity: "medium",
  description: "Reddit username",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 20) return false;
    return /reddit|subreddit|post|comment|karma/i.test(context);
  }
};
var XBOX_GAMERTAG = {
  type: "XBOX_GAMERTAG",
  regex: /\b([a-zA-Z][a-zA-Z0-9 ]{2,14})\b/g,
  placeholder: "[XBOX_TAG_{n}]",
  priority: 70,
  severity: "medium",
  description: "Xbox Live Gamertag",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 15) return false;
    if (!/^[a-zA-Z]/.test(value)) return false;
    return /xbox|gamertag|live|microsoft|gaming|player/i.test(context);
  }
};
var PSN_ID = {
  type: "PSN_ID",
  regex: /\b([a-zA-Z][a-zA-Z0-9_-]{2,15})\b/g,
  placeholder: "[PSN_{n}]",
  priority: 70,
  severity: "medium",
  description: "PlayStation Network ID",
  validator: (value, context) => {
    if (value.length < 3 || value.length > 16) return false;
    if (!/^[a-zA-Z]/.test(value)) return false;
    return /playstation|psn|sony|ps4|ps5|gamer|player/i.test(context);
  }
};
var NINTENDO_FRIEND_CODE = {
  type: "NINTENDO_FRIEND_CODE",
  regex: /\bSW[-\s]?(\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/gi,
  placeholder: "[NINTENDO_FC_{n}]",
  priority: 90,
  severity: "medium",
  description: "Nintendo Switch Friend Code",
  validator: (value, context) => {
    if (value.replace(/\D/g, "").length !== 12) return false;
    return /nintendo|switch|friend[- ]?code|gaming/i.test(context);
  }
};
var BATTLETAG = {
  type: "BATTLETAG",
  regex: /\b([a-zA-Z][a-zA-Z0-9]{2,11}#\d{4,5})\b/g,
  placeholder: "[BTAG_{n}]",
  priority: 80,
  severity: "medium",
  description: "Battle.net BattleTag",
  validator: (value, context) => {
    const parts = value.split("#");
    if (parts.length !== 2) return false;
    if (parts[0].length < 3 || parts[0].length > 12) return false;
    if (parts[1].length < 4 || parts[1].length > 5) return false;
    return /battle|battletag|blizzard|overwatch|warcraft|diablo/i.test(context);
  }
};
var EPIC_GAMES_ID = {
  type: "EPIC_GAMES_ID",
  regex: /\b([a-f0-9]{32})\b/gi,
  placeholder: "[EPIC_ID_{n}]",
  priority: 75,
  severity: "medium",
  description: "Epic Games account ID",
  validator: (value, context) => {
    if (value.length !== 32) return false;
    if (!/^[a-f0-9]+$/i.test(value)) return false;
    return /epic|fortnite|unreal|games|launcher|account/i.test(context);
  }
};
var TELEGRAM_USER_ID = {
  type: "TELEGRAM_USER_ID",
  regex: /\b(\d{6,10})\b/g,
  placeholder: "[TG_ID_{n}]",
  priority: 70,
  severity: "medium",
  description: "Telegram user ID",
  validator: (value, context) => {
    const length = value.length;
    if (length < 6 || length > 10) return false;
    return /telegram|tg|chat|user[-_]?id|messenger/i.test(context);
  }
};
var digitalIdentityPatterns = [
  DISCORD_USER_ID,
  STEAM_ID64,
  SOCIAL_MEDIA_HANDLE,
  TWITTER_USER_ID,
  FACEBOOK_ID,
  INSTAGRAM_USERNAME,
  TIKTOK_USERNAME,
  LINKEDIN_PROFILE,
  YOUTUBE_CHANNEL_ID,
  REDDIT_USERNAME,
  XBOX_GAMERTAG,
  PSN_ID,
  NINTENDO_FRIEND_CODE,
  BATTLETAG,
  EPIC_GAMES_ID,
  TELEGRAM_USER_ID
];
var allPatterns = [
  ...personalPatterns,
  ...financialPatterns,
  ...cryptoExtendedPatterns,
  ...governmentPatterns,
  ...contactPatterns,
  ...networkPatterns,
  ...healthcarePatterns,
  ...financialPatterns$1,
  ...technologyPatterns,
  ...legalPatterns,
  ...educationPatterns,
  ...hrPatterns,
  ...insurancePatterns,
  ...retailPatterns,
  ...realEstatePatterns,
  ...gigEconomyPatterns,
  ...hospitalityPatterns,
  ...professionalCertificationPatterns,
  ...gamingPatterns,
  ...vehiclePatterns,
  ...logisticsPatterns,
  ...aviationPatterns,
  ...maritimePatterns,
  ...environmentalPatterns,
  ...telecomsPatterns,
  ...manufacturingPatterns,
  ...transportationPatterns,
  ...mediaPatterns,
  ...charitablePatterns,
  ...procurementPatterns,
  ...emergencyServicesPatterns,
  ...internationalPatterns,
  ...digitalIdentityPatterns
];
function getPatternsByCategory(category) {
  switch (category) {
    case "personal":
      return personalPatterns;
    case "financial":
    case "crypto":
    case "cryptocurrency":
      return [
        ...financialPatterns,
        ...cryptoExtendedPatterns,
        ...financialPatterns$1
      ];
    case "government":
      return [...governmentPatterns, ...internationalPatterns];
    case "contact":
      return contactPatterns;
    case "network":
      return networkPatterns;
    case "healthcare":
      return healthcarePatterns;
    case "legal":
      return legalPatterns;
    case "education":
      return educationPatterns;
    case "hr":
    case "recruitment":
      return hrPatterns;
    case "credentials":
    case "technology":
      return technologyPatterns;
    case "insurance":
      return insurancePatterns;
    case "retail":
    case "ecommerce":
      return retailPatterns;
    case "telecoms":
    case "telecommunications":
    case "utilities":
      return telecomsPatterns;
    case "manufacturing":
      return manufacturingPatterns;
    case "transportation":
    case "automotive":
      return transportationPatterns;
    case "media":
    case "publishing":
      return mediaPatterns;
    case "charitable":
    case "charity":
    case "nonprofit":
    case "ngo":
      return charitablePatterns;
    case "procurement":
    case "purchasing":
    case "supply-chain":
      return procurementPatterns;
    case "emergency":
    case "emergency-services":
    case "public-safety":
    case "911":
    case "first-responders":
      return emergencyServicesPatterns;
    case "digital-identity":
    case "social-media":
    case "gaming":
    case "online-identity":
      return digitalIdentityPatterns;
    case "real-estate":
    case "property":
    case "realestate":
      return realEstatePatterns;
    case "gig-economy":
    case "gig":
    case "rideshare":
    case "delivery":
    case "freelance":
      return gigEconomyPatterns;
    case "hospitality":
    case "tourism":
    case "travel":
    case "hotel":
    case "airline":
      return hospitalityPatterns;
    case "certifications":
    case "professional-certifications":
    case "licenses":
      return professionalCertificationPatterns;
    case "esports":
    case "videogames":
    case "gamers":
      return gamingPatterns;
    case "vehicles":
    case "license-plates":
    case "vin":
      return vehiclePatterns;
    case "logistics":
    case "shipping":
    case "tracking":
    case "freight":
      return logisticsPatterns;
    case "aviation":
    case "flight":
    case "aircraft":
      return aviationPatterns;
    case "maritime":
    case "vessel":
    case "marine":
    case "ship":
      return maritimePatterns;
    case "environmental":
    case "regulatory":
    case "epa":
    case "compliance":
    case "permits":
      return environmentalPatterns;
    default:
      return [];
  }
}
function deterministicHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}
function generateDeterministicId(value, type) {
  return (deterministicHash(`${type}:${value.toLowerCase()}`) % 1e4).toString().padStart(4, "0");
}
var gdprPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  patterns: [
    "EMAIL",
    "NAME",
    "PHONE_UK",
    "PHONE_UK_MOBILE",
    "PHONE_INTERNATIONAL",
    "IPV4",
    "IPV6",
    "POSTCODE_UK",
    "ADDRESS_STREET",
    "NATIONAL_INSURANCE_UK",
    "NHS_NUMBER",
    "PASSPORT_UK",
    "DRIVING_LICENSE_UK",
    "IBAN",
    "CREDIT_CARD"
  ]
};
var hipaaPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  patterns: [
    "EMAIL",
    "NAME",
    "SSN",
    "PHONE_US",
    "ZIP_CODE_US",
    "ADDRESS_STREET",
    "DATE_OF_BIRTH",
    "PASSPORT_US",
    "DRIVING_LICENSE_US",
    "CREDIT_CARD",
    "BANK_ACCOUNT_UK",
    "IPV4",
    "IPV6",
    "EMPLOYEE_ID"
  ]
};
var ccpaPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  patterns: [
    "EMAIL",
    "NAME",
    "SSN",
    "PHONE_US",
    "ZIP_CODE_US",
    "ADDRESS_STREET",
    "IPV4",
    "IPV6",
    "CREDIT_CARD",
    "PASSPORT_US",
    "DRIVING_LICENSE_US",
    "USERNAME"
  ]
};
var healthcarePreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "healthcare",
    "insurance",
    "government"
  ]
};
var healthcareResearchPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "healthcare",
    "insurance",
    "government"
  ]
};
var financePreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "financial",
    "government",
    "network"
  ]
};
var educationPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "education",
    "government",
    "network"
  ]
};
var transportLogisticsPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "transportation",
    "logistics",
    "vehicles",
    "network"
  ]
};
var pciDssPreset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "financial",
    "network"
  ]
};
var soc2Preset = {
  includeNames: true,
  includeEmails: true,
  includePhones: true,
  includeAddresses: true,
  categories: [
    "personal",
    "contact",
    "financial",
    "government",
    "network",
    "digital-identity"
  ]
};
function getPreset(name) {
  switch (name.toLowerCase()) {
    case "gdpr":
      return gdprPreset;
    case "hipaa":
      return hipaaPreset;
    case "ccpa":
      return ccpaPreset;
    case "healthcare":
    case "healthcare-provider":
      return healthcarePreset;
    case "healthcare-research":
      return healthcareResearchPreset;
    case "finance":
    case "financial-services":
      return financePreset;
    case "education":
      return educationPreset;
    case "transport-logistics":
    case "transportation":
    case "logistics":
      return transportLogisticsPreset;
    case "pci-dss":
    case "pci_dss":
      return pciDssPreset;
    case "soc2":
    case "soc-2":
      return soc2Preset;
    default:
      return {};
  }
}
function applyRedactionMode(value, type, mode, placeholder) {
  switch (mode) {
    case "placeholder":
      return placeholder;
    case "mask-middle":
      return maskMiddle(value, type);
    case "mask-all":
      return "*".repeat(value.length);
    case "format-preserving":
      return formatPreserving(value, type);
    case "token-replace":
      return tokenReplace(value, type);
    default:
      return placeholder;
  }
}
function maskMiddle(value, type) {
  if (type.includes("EMAIL")) {
    const atIndex = value.indexOf("@");
    if (atIndex > 0) {
      const username = value.substring(0, atIndex);
      const domain = value.substring(atIndex);
      return (username.length <= 2 ? "*".repeat(username.length) : username[0] + "*".repeat(username.length - 1)) + domain;
    }
  }
  if (type.includes("PHONE")) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      const areaCode = digits.substring(0, 3);
      const lastFour = digits.substring(digits.length - 4);
      const middleCount = digits.length - 7;
      return `${areaCode}-${"*".repeat(middleCount > 0 ? middleCount : 2)}-${lastFour}`;
    }
  }
  if (type === "SSN") {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 9) return `***-**-${digits.substring(5)}`;
  }
  if (type === "CREDIT_CARD") {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 13) {
      const first2 = digits.substring(0, 4);
      const last2 = digits.substring(digits.length - 4);
      const middleGroups = Math.floor((digits.length - 8) / 4);
      return `${first2}-${("****-".repeat(middleGroups) + "****").substring(0, digits.length - 8)}-${last2}`;
    }
  }
  if (value.length <= 4) return "*".repeat(value.length);
  const showCount = Math.min(2, Math.floor(value.length * 0.2));
  const first = value.substring(0, showCount);
  const last = value.substring(value.length - showCount);
  const maskCount = value.length - showCount * 2;
  return `${first}${"*".repeat(maskCount)}${last}`;
}
function formatPreserving(value, type) {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (!/[a-zA-Z0-9]/.test(char)) result += char;
    else if (/[a-zA-Z]/.test(char)) result += char === char.toUpperCase() ? "X" : "x";
    else result += "X";
  }
  return result;
}
function tokenReplace(value, type) {
  const hash = simpleHash(value);
  if (type.includes("EMAIL")) {
    const domains = [
      "example.com",
      "test.com",
      "sample.org",
      "demo.net"
    ];
    const usernames = [
      "user",
      "john.doe",
      "jane.smith",
      "test.account"
    ];
    return `${usernames[hash % usernames.length]}${hash % 100}@${domains[hash % domains.length]}`;
  }
  if (type.includes("PHONE")) return `(555) ${hash % 900 + 100}-${hash % 9e3 + 1e3}`;
  if (type === "SSN") return `${hash % 899 + 100}-${(hash % 99 + 1).toString().padStart(2, "0")}-${(hash % 9999 + 1).toString().padStart(4, "0")}`;
  if (type === "CREDIT_CARD") return `4532-${[
    (hash % 9e3 + 1e3).toString(),
    (hash % 9e3 + 1e3).toString(),
    (hash % 9e3 + 1e3).toString()
  ].join("-")}`;
  if (type.includes("NAME")) {
    const firstNames = [
      "John",
      "Jane",
      "Alex",
      "Sam",
      "Chris",
      "Pat"
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Davis"
    ];
    return `${firstNames[hash % firstNames.length]} ${lastNames[(hash >> 4) % lastNames.length]}`;
  }
  return `[REDACTED_${type}]`;
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
var LocalLearningStore = class {
  constructor(filePath = ".openredaction/learnings.json", options = {}) {
    this.filePath = filePath;
    this.autoSave = options.autoSave ?? true;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.85;
    this.data = this.load();
  }
  /**
  * Load learning data from file
  */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
    }
    return {
      version: "1.0",
      whitelist: [],
      patternAdjustments: [],
      stats: {
        totalDetections: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracy: 1,
        lastUpdated: Date.now()
      }
    };
  }
  /**
  * Save learning data to file
  */
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.data.stats.lastUpdated = Date.now();
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Failed to save learning data:", error);
    }
  }
  /**
  * Record a false positive detection
  */
  recordFalsePositive(text, _type, context) {
    this.data.stats.falsePositives++;
    this.data.stats.totalDetections++;
    this.updateAccuracy();
    let entry = this.data.whitelist.find((e) => e.pattern === text);
    if (entry) {
      entry.occurrences++;
      entry.lastSeen = Date.now();
      if (!entry.contexts.includes(context)) entry.contexts.push(context);
      entry.confidence = Math.min(0.99, entry.confidence + 0.05);
    } else {
      entry = {
        pattern: text,
        confidence: 0.5,
        occurrences: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        contexts: [context]
      };
      this.data.whitelist.push(entry);
    }
    if (this.autoSave) this.save();
  }
  /**
  * Record a false negative (missed detection)
  */
  recordFalseNegative(text, type, _context) {
    this.data.stats.falseNegatives++;
    this.data.stats.totalDetections++;
    this.updateAccuracy();
    let adjustment = this.data.patternAdjustments.find((a) => a.type === type && a.examples.includes(text));
    if (adjustment) {
      adjustment.occurrences++;
      adjustment.confidence = Math.min(0.99, adjustment.confidence + 0.05);
    } else {
      adjustment = {
        type,
        issue: `Pattern not detected`,
        suggestion: `Consider adding pattern for: ${text}`,
        confidence: 0.5,
        examples: [text],
        occurrences: 1
      };
      this.data.patternAdjustments.push(adjustment);
    }
    if (this.autoSave) this.save();
  }
  /**
  * Record a correct detection
  */
  recordCorrectDetection() {
    this.data.stats.totalDetections++;
    this.updateAccuracy();
    if (this.autoSave) this.save();
  }
  /**
  * Update accuracy calculation
  */
  updateAccuracy() {
    const total = this.data.stats.totalDetections;
    if (total === 0) {
      this.data.stats.accuracy = 1;
      return;
    }
    const incorrect = this.data.stats.falsePositives + this.data.stats.falseNegatives;
    this.data.stats.accuracy = (total - incorrect) / total;
  }
  /**
  * Get whitelist entries above confidence threshold
  */
  getWhitelist() {
    return this.data.whitelist.filter((e) => e.confidence >= this.confidenceThreshold).map((e) => e.pattern);
  }
  /**
  * Get all whitelist entries with metadata
  */
  getWhitelistEntries() {
    return this.data.whitelist;
  }
  /**
  * Get pattern adjustments above confidence threshold
  */
  getPatternAdjustments() {
    return this.data.patternAdjustments.filter((a) => a.confidence >= this.confidenceThreshold).sort((a, b) => b.occurrences - a.occurrences);
  }
  /**
  * Get all pattern adjustments
  */
  getAllPatternAdjustments() {
    return this.data.patternAdjustments;
  }
  /**
  * Get learning statistics
  */
  getStats() {
    return { ...this.data.stats };
  }
  /**
  * Get confidence score for a specific pattern
  */
  getConfidence(pattern) {
    return this.data.whitelist.find((e) => e.pattern === pattern)?.confidence ?? 0;
  }
  /**
  * Get occurrences count for a specific pattern
  */
  getOccurrences(pattern) {
    return this.data.whitelist.find((e) => e.pattern === pattern)?.occurrences ?? 0;
  }
  /**
  * Manually add pattern to whitelist
  */
  addToWhitelist(pattern, confidence = 0.9) {
    const existing = this.data.whitelist.find((e) => e.pattern === pattern);
    if (existing) {
      existing.confidence = confidence;
      existing.occurrences++;
      existing.lastSeen = Date.now();
    } else this.data.whitelist.push({
      pattern,
      confidence,
      occurrences: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      contexts: []
    });
    if (this.autoSave) this.save();
  }
  /**
  * Remove pattern from whitelist
  */
  removeFromWhitelist(pattern) {
    this.data.whitelist = this.data.whitelist.filter((e) => e.pattern !== pattern);
    if (this.autoSave) this.save();
  }
  /**
  * Clear all learning data
  */
  clear() {
    this.data = {
      version: "1.0",
      whitelist: [],
      patternAdjustments: [],
      stats: {
        totalDetections: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracy: 1,
        lastUpdated: Date.now()
      }
    };
    if (this.autoSave) this.save();
  }
  /**
  * Export learning data (for sharing)
  */
  export(options = {}) {
    const minConfidence = options.minConfidence ?? 0.7;
    const includeContexts = options.includeContexts ?? false;
    return {
      version: this.data.version,
      whitelist: this.data.whitelist.filter((e) => e.confidence >= minConfidence).map((e) => ({
        ...e,
        contexts: includeContexts ? e.contexts : []
      })),
      patternAdjustments: this.data.patternAdjustments.filter((a) => a.confidence >= minConfidence),
      stats: this.data.stats
    };
  }
  /**
  * Import learning data (merge with existing)
  */
  import(data, merge = true) {
    if (!merge) {
      this.data = data;
      this.save();
      return;
    }
    for (const entry of data.whitelist) {
      const existing = this.data.whitelist.find((e) => e.pattern === entry.pattern);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, entry.confidence);
        existing.occurrences += entry.occurrences;
        existing.lastSeen = Math.max(existing.lastSeen, entry.lastSeen);
        existing.contexts = [.../* @__PURE__ */ new Set([...existing.contexts, ...entry.contexts])];
      } else this.data.whitelist.push(entry);
    }
    for (const adjustment of data.patternAdjustments) {
      const existing = this.data.patternAdjustments.find((a) => a.type === adjustment.type && a.issue === adjustment.issue);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, adjustment.confidence);
        existing.occurrences += adjustment.occurrences;
        existing.examples = [.../* @__PURE__ */ new Set([...existing.examples, ...adjustment.examples])];
      } else this.data.patternAdjustments.push(adjustment);
    }
    this.data.stats.totalDetections += data.stats.totalDetections;
    this.data.stats.falsePositives += data.stats.falsePositives;
    this.data.stats.falseNegatives += data.stats.falseNegatives;
    this.updateAccuracy();
    if (this.autoSave) this.save();
  }
  /**
  * Manually save data
  */
  flush() {
    this.save();
  }
};
var ConfigLoader = class {
  constructor(configPath, cwd = process.cwd()) {
    this.configPath = configPath || "";
    this.searchPaths = [
      cwd,
      path.join(cwd, ".openredaction"),
      path.join(process.env.HOME || "~", ".openredaction")
    ];
  }
  /**
  * Find config file in search paths
  */
  findConfigFile() {
    if (this.configPath && fs.existsSync(this.configPath)) return this.configPath;
    const configNames = [
      ".openredaction.config.js",
      ".openredaction.config.mjs",
      ".openredaction.config.json",
      "openredaction.config.js",
      "openredaction.config.mjs",
      "openredaction.config.json"
    ];
    for (const searchPath of this.searchPaths) for (const configName of configNames) {
      const fullPath = path.join(searchPath, configName);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
  }
  /**
  * Load config file
  */
  async load() {
    const configFile = this.findConfigFile();
    if (!configFile) return null;
    try {
      if (configFile.endsWith(".json")) {
        const content = fs.readFileSync(configFile, "utf-8");
        return JSON.parse(content);
      }
      const config = await import(configFile);
      return config.default || config;
    } catch (error) {
      console.error(`Failed to load config from ${configFile}:`, error);
      return null;
    }
  }
  /**
  * Resolve presets and extends
  */
  resolveConfig(config) {
    const resolved = { ...config };
    if (config.extends) {
      const presets = Array.isArray(config.extends) ? config.extends : [config.extends];
      for (const preset of presets) {
        const presetConfig = this.loadPreset(preset);
        if (presetConfig) Object.assign(resolved, presetConfig, config);
      }
    }
    return resolved;
  }
  /**
  * Load built-in preset
  */
  loadPreset(preset) {
    if (preset === "openredaction:recommended") return {
      includeNames: true,
      includeAddresses: true,
      includePhones: true,
      includeEmails: true,
      deterministic: true
    };
    if (preset === "openredaction:strict") return {
      includeNames: true,
      includeAddresses: true,
      includePhones: true,
      includeEmails: true,
      deterministic: true,
      preset: "gdpr"
    };
    if (preset === "openredaction:minimal") return {
      includeNames: false,
      includeAddresses: false,
      includePhones: true,
      includeEmails: true,
      deterministic: true
    };
    if (preset.startsWith("openredaction:")) {
      const presetName = preset.replace("openredaction:", "");
      if ([
        "gdpr",
        "hipaa",
        "ccpa",
        "healthcare",
        "healthcare-provider",
        "healthcare-research",
        "finance",
        "financial-services",
        "education",
        "transport-logistics",
        "transportation",
        "logistics"
      ].includes(presetName)) return { preset: presetName };
    }
    return null;
  }
  /**
  * Create a default config file
  */
  static createDefaultConfig(outputPath = ".openredaction.config.js") {
    fs.writeFileSync(outputPath, `/**
 * OpenRedaction Configuration
 * @see https://github.com/sam247/openredaction
 */
export default {
  // Extend built-in presets
  // Options: 'openredaction:recommended', 'openredaction:strict', 'openredaction:minimal'
  // Or compliance/industry presets: 'openredaction:gdpr', 'openredaction:hipaa', 'openredaction:ccpa',
  // 'openredaction:finance', 'openredaction:education', 'openredaction:healthcare', 'openredaction:transport-logistics'
  extends: ['openredaction:recommended'],

  // Detection options
  includeNames: true,
  includeAddresses: true,
  includePhones: true,
  includeEmails: true,

  // Deterministic placeholders (same PII -> same placeholder)
  deterministic: true,

  // Whitelist - patterns to never redact
  whitelist: [
    'Example Corp',
    'Test User',
    'API'
  ],

  // Custom patterns
  customPatterns: [
    {
      name: 'INTERNAL_ID',
      regex: /INT-\\d{6}/g,
      category: 'personal',
      priority: 90,
      description: 'Internal employee ID'
    }
  ],

  // Learning options
  learnedPatterns: '.openredaction/learnings.json',
  learningOptions: {
    autoSave: true,
    confidenceThreshold: 0.85
  }
};
`);
    console.log(`Created config file: ${outputPath}`);
  }
};
function extractContext(text, startPos, endPos, wordsBefore = 5, wordsAfter = 5) {
  const beforeWords = text.substring(Math.max(0, startPos - 250), startPos).split(/\s+/).filter((w) => w.length > 0).slice(-wordsBefore);
  const before = beforeWords.join(" ");
  const afterWords = text.substring(endPos, Math.min(text.length, endPos + 250)).split(/\s+/).filter((w) => w.length > 0).slice(0, wordsAfter);
  return {
    before,
    after: afterWords.join(" "),
    beforeWords,
    afterWords,
    sentence: extractSentence(text, startPos, endPos)
  };
}
function extractSentence(text, startPos, endPos) {
  const sentenceStart = findSentenceStart(text, startPos);
  const sentenceEnd = findSentenceEnd(text, endPos);
  return text.substring(sentenceStart, sentenceEnd).trim();
}
function findSentenceStart(text, pos) {
  for (let i = pos - 1; i >= 0; i--) {
    const char = text[i];
    if (char === "." || char === "!" || char === "?" || char === "\n") return i + 1;
  }
  return 0;
}
function findSentenceEnd(text, pos) {
  for (let i = pos; i < text.length; i++) {
    const char = text[i];
    if (char === "." || char === "!" || char === "?" || char === "\n") return i + 1;
  }
  return text.length;
}
function inferDocumentType(text) {
  const sample = text.substring(0, Math.min(1e3, text.length)).toLowerCase();
  const emailScore = (sample.match(/\b(from|to|subject|dear|regards|sincerely|cc|bcc):/gi) || []).length;
  const codeScore = (sample.match(/\b(function|const|let|var|class|import|export|return|if|else|for|while)\b/g) || []).length;
  const chatScore = (sample.match(/<.*?>|^\[?\d{1,2}:\d{2}\]?|^>|^@/gm) || []).length;
  if (codeScore > 5) return "code";
  if (emailScore > 2) return "email";
  if (chatScore > 3) return "chat";
  return "document";
}
function analyzeContextFeatures(fullContext) {
  const lower = fullContext.toLowerCase();
  const hasTechnicalContext = (lower.match(/\b(api|sdk|cli|gui|json|xml|http|url|database|server|client|endpoint|variable|function|method|class|interface|code|debug|log)\b/g) || []).length > 0;
  const hasBusinessContext = (lower.match(/\b(company|corporation|corp|ltd|llc|inc|ceo|cto|cfo|manager|director|employee|staff|team|department|office|business)\b/g) || []).length > 0;
  const hasMedicalContext = (lower.match(/\b(patient|doctor|physician|nurse|hospital|clinic|medical|health|diagnosis|treatment|prescription|medication|surgery|exam|test|lab|specimen)\b/g) || []).length > 0;
  const hasFinancialContext = (lower.match(/\b(bank|account|payment|transaction|transfer|wire|credit|debit|balance|deposit|withdrawal|loan|mortgage|investment|trading|stock|bond)\b/g) || []).length > 0;
  const strongTestPatterns = [
    /\b(test|testing|dummy|mock|fake)\s+(data|value|example|user|account|email|phone)/i,
    /\bfor\s+(testing|demonstration|example)\s+purposes/i,
    /\b(this|here)\s+is\s+(an?\s+)?(example|sample|test)/i,
    /\bxxx+|000+|111+|123+/i,
    /\blorem\s+ipsum/i
  ];
  const weakMatches = (lower.match(/\b(example|sample|test|demo|placeholder|dummy|mock)\b/g) || []).length;
  return {
    hasTechnicalContext,
    hasBusinessContext,
    hasMedicalContext,
    hasFinancialContext,
    hasExampleContext: strongTestPatterns.some((pattern) => pattern.test(fullContext)) || weakMatches >= 2,
    relativePosition: 0
  };
}
function calculateContextConfidence(_value, patternType, context) {
  let confidence = 0.8;
  if (context.documentType === "code") {
    if (![
      "API_KEY",
      "JWT",
      "BEARER_TOKEN",
      "AWS_ACCESS_KEY",
      "GITHUB_TOKEN",
      "SECRET"
    ].some((p) => patternType.includes(p))) confidence -= 0.15;
  } else if (context.documentType === "email") {
    if ([
      "EMAIL",
      "PHONE",
      "NAME",
      "ADDRESS"
    ].includes(patternType.split("_")[0])) confidence += 0.1;
  }
  if (context.features.hasExampleContext && patternType === "EMAIL") confidence -= 0.15;
  if (context.features.hasMedicalContext && [
    "MEDICAL",
    "MRN",
    "PATIENT",
    "NHS",
    "NPI",
    "DEA",
    "ICD",
    "CPT",
    "PRESCRIPTION"
  ].some((p) => patternType.includes(p))) confidence += 0.15;
  if (context.features.hasFinancialContext && [
    "ACCOUNT",
    "TRANSACTION",
    "SWIFT",
    "IBAN",
    "BITCOIN",
    "ETHEREUM",
    "CRYPTO",
    "PAYMENT",
    "CREDIT_CARD"
  ].some((p) => patternType.includes(p))) confidence += 0.15;
  if (context.features.hasTechnicalContext && ![
    "API_KEY",
    "TOKEN",
    "SECRET",
    "AWS",
    "GITHUB",
    "STRIPE",
    "JWT"
  ].some((p) => patternType.includes(p))) confidence -= 0.05;
  const beforeLower = context.before.toLowerCase();
  const afterLower = context.after.toLowerCase();
  for (const indicator of [
    {
      pattern: /\b(dear|hello|hi|mr|mrs|ms|dr)\s*$/i,
      boost: 0.2,
      types: ["NAME"]
    },
    {
      pattern: /^(is|was|wrote|said|told)/i,
      boost: 0.15,
      types: ["NAME"]
    },
    {
      pattern: /\b(call|phone|tel|mobile):\s*$/i,
      boost: 0.2,
      types: ["PHONE"]
    },
    {
      pattern: /\b(email|e-mail|contact):\s*$/i,
      boost: 0.2,
      types: ["EMAIL"]
    },
    {
      pattern: /\b(patient|subject|participant):\s*$/i,
      boost: 0.25,
      types: [
        "NAME",
        "PATIENT_ID",
        "MRN"
      ]
    },
    {
      pattern: /\b(account|acct)[\s#:]*$/i,
      boost: 0.2,
      types: ["ACCOUNT", "BANK"]
    }
  ]) if (indicator.pattern.test(beforeLower)) {
    if (indicator.types.some((t) => patternType.includes(t))) confidence += indicator.boost;
  }
  for (const indicator of [
    {
      pattern: /\b(the|a|an)\s*$/i,
      penalty: 0.3,
      types: ["NAME"]
    },
    {
      pattern: /\b(version|v|release)\s*$/i,
      penalty: 0.4,
      types: ["PHONE", "NUMBER"]
    },
    {
      pattern: /^\s*(street|avenue|road|drive|way)/i,
      penalty: 0.2,
      types: ["NAME"]
    }
  ]) if (indicator.pattern.test(beforeLower) || indicator.pattern.test(afterLower)) {
    if (indicator.types.some((t) => patternType.includes(t))) confidence -= indicator.penalty;
  }
  return Math.max(0, Math.min(1, confidence));
}
function analyzeFullContext(text, value, patternType, startPos, endPos) {
  const { before, after, beforeWords, afterWords, sentence } = extractContext(text, startPos, endPos);
  const documentType = inferDocumentType(text);
  const features = analyzeContextFeatures(before + " " + value + " " + after);
  features.relativePosition = startPos / text.length;
  return {
    beforeWords,
    afterWords,
    sentence,
    documentType,
    confidence: calculateContextConfidence(value, patternType, {
      before,
      after,
      sentence,
      documentType,
      features
    })
  };
}
var commonFalsePositives = [
  {
    patternType: [
      "PHONE",
      "PHONE_UK",
      "PHONE_US"
    ],
    matcher: (value, context) => {
      if (/\b(version|v|ver|release|build)\s*[:\s]*/i.test(context)) return true;
      if (/^\d{1,2}\.\d{1,2}\.\d{1,4}$/.test(value.replace(/[\s()-]/g, ""))) return true;
      return false;
    },
    description: "Version number mistaken for phone number",
    severity: "high"
  },
  {
    patternType: [
      "PHONE",
      "PHONE_UK",
      "PHONE_US"
    ],
    matcher: (value, context) => {
      if (/\b(date|born|birth|dob|created|updated|on|since|until|before|after)\s*[:\s]*/i.test(context)) return true;
      const datePatterns = [
        /^\d{2}[-/]\d{2}[-/]\d{4}$/,
        /^\d{4}[-/]\d{2}[-/]\d{2}$/,
        /^\d{2}[-/]\d{2}[-/]\d{2}$/
      ];
      const cleaned = value.replace(/[\s()]/g, "");
      return datePatterns.some((pattern) => pattern.test(cleaned));
    },
    description: "Date mistaken for phone number",
    severity: "high"
  },
  {
    patternType: [
      "PHONE",
      "ACCOUNT",
      "ID"
    ],
    matcher: (value, context) => {
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return true;
      return /\b(ip|address|server|host|network|subnet)\s*[:\s]*/i.test(context);
    },
    description: "IP address mistaken for PII",
    severity: "high"
  },
  {
    patternType: ["PHONE", "NUMBER"],
    matcher: (value, context) => {
      return /\b(cm|mm|km|m|ft|in|inch|meter|mile|kg|lb|oz|gram|litre|liter|ml|gb|mb|kb)\s*$/i.test(context + " " + value) || /\b(size|width|height|length|weight|distance|volume|capacity|dimension)\s*[:\s]*/i.test(context);
    },
    description: "Measurement mistaken for PII",
    severity: "medium"
  },
  {
    patternType: [
      "PHONE",
      "ID",
      "NUMBER"
    ],
    matcher: (value) => {
      const yearPattern = /^(19|20)\d{2}$/;
      const cleaned = value.replace(/[\s()-]/g, "");
      return yearPattern.test(cleaned);
    },
    description: "Year mistaken for PII",
    severity: "medium"
  },
  {
    patternType: [
      "PHONE",
      "ACCOUNT",
      "NUMBER"
    ],
    matcher: (value, context) => {
      if (/\b(price|cost|amount|total|subtotal|fee|charge|payment|\$|£|€|¥|USD|GBP|EUR)\s*[:\s]*/i.test(context)) return true;
      return /^\d{1,6}\.\d{2}$/.test(value.replace(/[\s,]/g, ""));
    },
    description: "Price mistaken for PII",
    severity: "medium"
  },
  {
    patternType: [
      "PHONE",
      "ID",
      "NUMBER"
    ],
    matcher: (value, context) => {
      return /\bport[:\s]*$/i.test(context) && /^([1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/.test(value);
    },
    description: "Port number mistaken for PII",
    severity: "high"
  },
  {
    patternType: ["PHONE", "NUMBER"],
    matcher: (value, context) => {
      const fullContext = context + " " + value;
      return /\d+(\.\d+)?\s*(percent|percentage|%)/i.test(fullContext);
    },
    description: "Percentage mistaken for PII",
    severity: "high"
  },
  {
    patternType: ["NAME", "EMAIL"],
    matcher: (value, context) => {
      if (/\b(foo|bar|baz|qux|example|test|demo|sample|placeholder|dummy|mock)\b/i.test(value.toLowerCase())) return true;
      return /(\/\/|\/\*|\*|#|--|<!--|;)/.test(context);
    },
    description: "Technical placeholder mistaken for PII",
    severity: "high"
  },
  {
    patternType: [
      "EMAIL",
      "NAME",
      "PHONE",
      "ADDRESS"
    ],
    matcher: (value) => {
      return [
        /test\d*@/i,
        /example\.com$/i,
        /foo@/i,
        /bar@/i,
        /johndoe/i,
        /janedoe/i,
        /^xxx+$/i,
        /^000[-\s]*000[-\s]*000/i
      ].some((pattern) => pattern.test(value));
    },
    description: "Test data mistaken for PII",
    severity: "high"
  },
  {
    patternType: ["NAME"],
    matcher: (_value, context) => {
      return /\b(the|a|an)\s*$/i.test(context);
    },
    description: "Common word after article, not a name",
    severity: "medium"
  },
  {
    patternType: ["INSTAGRAM_USERNAME", "TIKTOK_USERNAME"],
    matcher: (value, _context) => {
      return (/* @__PURE__ */ new Set([
        "its",
        "and",
        "the",
        "for",
        "are",
        "but",
        "not",
        "you",
        "all",
        "can",
        "had",
        "her",
        "was",
        "one",
        "our",
        "out",
        "has",
        "him",
        "his",
        "how",
        "man",
        "new",
        "now",
        "old",
        "see",
        "way",
        "who",
        "boy",
        "did",
        "get",
        "let",
        "put",
        "say",
        "she",
        "too",
        "use",
        "latest",
        "design",
        "deliver",
        "flexible",
        "personalized",
        "entertainment",
        "experience",
        "powered",
        "portable",
        "projector",
        "designed",
        "announced",
        "launch",
        "global",
        "range",
        "spaces",
        "more",
        "cross",
        "wide"
      ])).has(value.toLowerCase());
    },
    description: "Common English word mistaken for social username",
    severity: "high"
  },
  {
    patternType: ["NAME"],
    matcher: (value, context) => {
      const keywords = [
        "function",
        "const",
        "let",
        "var",
        "class",
        "interface",
        "type",
        "enum",
        "public",
        "private",
        "protected",
        "static",
        "async",
        "await",
        "return",
        "import",
        "export",
        "from",
        "default",
        "extends",
        "implements"
      ];
      const valueLower = value.toLowerCase();
      if (keywords.includes(valueLower)) return true;
      return /\b(def|fn|func|method|prop|attr)\s*[:\s]*/i.test(context);
    },
    description: "Programming keyword mistaken for name",
    severity: "high"
  },
  {
    patternType: ["EMAIL"],
    matcher: (value) => {
      const commonDomains = [
        "localhost",
        "example.com",
        "example.org",
        "example.net",
        "test.com",
        "demo.com",
        "sample.com",
        "invalid.com",
        "domain.com"
      ];
      const domain = value.split("@")[1]?.toLowerCase();
      return commonDomains.includes(domain);
    },
    description: "Example email domain",
    severity: "high"
  },
  {
    patternType: ["ACCOUNT", "CARD"],
    matcher: (value, _context) => {
      if (/^0+$/.test(value.replace(/[\s-]/g, ""))) return true;
      const cleaned = value.replace(/[\s-]/g, "");
      if (/^(\d)\1+$/.test(cleaned)) return true;
      if (/^(0123456789|1234567890|9876543210)/.test(cleaned)) return true;
      return false;
    },
    description: "Test account/card number",
    severity: "high"
  },
  {
    patternType: [
      "PHONE",
      "ID",
      "NUMBER"
    ],
    matcher: (_value, context) => {
      return /\b(timestamp|time|epoch|unix|millis|seconds|created.at|updated.at)\s*[:\s]*/i.test(context);
    },
    description: "Timestamp mistaken for PII",
    severity: "medium"
  }
];
function isFalsePositive(value, patternType, context, rules = commonFalsePositives) {
  for (const rule of rules) {
    if (!(Array.isArray(rule.patternType) ? rule.patternType.some((t) => patternType.includes(t)) : patternType.includes(rule.patternType))) continue;
    if (rule.matcher(value, context)) return {
      isFalsePositive: true,
      matchedRule: rule,
      confidence: rule.severity === "high" ? 0.9 : rule.severity === "medium" ? 0.7 : 0.5
    };
  }
  return {
    isFalsePositive: false,
    confidence: 0
  };
}
var defaultPasses = [
  {
    name: "critical-credentials",
    minPriority: 95,
    maxPriority: 100,
    includeTypes: [
      "API_KEY",
      "TOKEN",
      "SECRET",
      "PASSWORD",
      "PRIVATE_KEY",
      "AWS",
      "GITHUB",
      "STRIPE",
      "OPENAI"
    ],
    description: "Critical credentials and API keys (priority 95-100)"
  },
  {
    name: "high-confidence",
    minPriority: 85,
    maxPriority: 94,
    description: "High-confidence patterns with strong validation (priority 85-94)"
  },
  {
    name: "standard-pii",
    minPriority: 70,
    maxPriority: 84,
    description: "Standard PII patterns (priority 70-84)"
  },
  {
    name: "low-priority",
    minPriority: 0,
    maxPriority: 69,
    description: "Low priority patterns (priority 0-69)"
  }
];
function groupPatternsByPass(patterns, passes = defaultPasses) {
  const grouped = /* @__PURE__ */ new Map();
  for (const pass of passes) grouped.set(pass.name, []);
  for (const pattern of patterns) for (const pass of passes) {
    if (pattern.priority < pass.minPriority || pattern.priority > pass.maxPriority) continue;
    if (pass.includeTypes && pass.includeTypes.length > 0) {
      if (!pass.includeTypes.some((type) => pattern.type.includes(type))) continue;
    }
    if (pass.excludeTypes && pass.excludeTypes.length > 0) {
      if (pass.excludeTypes.some((type) => pattern.type.includes(type))) continue;
    }
    grouped.get(pass.name).push(pattern);
    break;
  }
  for (const [passName, passPatterns] of grouped.entries()) {
    passPatterns.sort((a, b) => b.priority - a.priority);
    grouped.set(passName, passPatterns);
  }
  return grouped;
}
function overlapsWithExisting(start, end, ranges) {
  return ranges.some(([existingStart, existingEnd]) => start >= existingStart && start < existingEnd || end > existingStart && end <= existingEnd || start <= existingStart && end >= existingEnd);
}
function mergePassDetections(passDetections, passes) {
  const merged = [];
  const processedRanges = [];
  for (const pass of passes) {
    const detections = passDetections.get(pass.name) || [];
    for (const detection of detections) {
      const [start, end] = detection.position;
      if (overlapsWithExisting(start, end, processedRanges)) continue;
      merged.push(detection);
      processedRanges.push([start, end]);
    }
  }
  return merged;
}
function createSimpleMultiPass(options) {
  const numPasses = Math.min(Math.max(options?.numPasses || 3, 2), 5);
  const prioritizeCredentials = options?.prioritizeCredentials ?? true;
  const passes = [];
  const startPriority = prioritizeCredentials ? 0 : 0;
  const endPriority = prioritizeCredentials ? 89 : 100;
  const range = endPriority - startPriority;
  const passesNeeded = prioritizeCredentials ? numPasses - 1 : numPasses;
  const step = Math.floor(range / passesNeeded);
  const regularPasses = [];
  for (let i = 0; i < passesNeeded; i++) {
    const min = startPriority + i * step;
    const max = i === passesNeeded - 1 ? endPriority : startPriority + (i + 1) * step - 1;
    regularPasses.push({
      name: `pass-${i + 1}`,
      minPriority: min,
      maxPriority: max,
      description: `Priority ${min}-${max}`
    });
  }
  passes.push(...regularPasses.reverse());
  if (prioritizeCredentials) passes.unshift({
    name: "credentials",
    minPriority: 90,
    maxPriority: 100,
    includeTypes: [
      "API_KEY",
      "TOKEN",
      "SECRET",
      "PASSWORD",
      "AWS",
      "GITHUB",
      "STRIPE",
      "JWT",
      "OPENAI"
    ],
    description: "Credentials and API keys"
  });
  return passes;
}
var NERDetector = class {
  constructor() {
    this.available = false;
    try {
      this.nlp = __require2("compromise");
      this.available = true;
    } catch {
      this.available = false;
    }
  }
  /**
  * Check if NER is available (compromise.js installed)
  */
  isAvailable() {
    return this.available;
  }
  /**
  * Detect named entities in text
  */
  detect(text) {
    if (!this.available || !this.nlp) return [];
    const matches = [];
    try {
      const doc = this.nlp(text);
      doc.people().forEach((person) => {
        const personText = person.text();
        const offset = text.indexOf(personText);
        if (offset !== -1) matches.push({
          type: "PERSON",
          text: personText,
          start: offset,
          end: offset + personText.length,
          confidence: 0.85,
          context: {
            sentence: this.getSentence(text, offset),
            tags: person.tags()
          }
        });
      });
      doc.organizations().forEach((org) => {
        const orgText = org.text();
        const offset = text.indexOf(orgText);
        if (offset !== -1) matches.push({
          type: "ORGANIZATION",
          text: orgText,
          start: offset,
          end: offset + orgText.length,
          confidence: 0.8,
          context: {
            sentence: this.getSentence(text, offset),
            tags: org.tags()
          }
        });
      });
      doc.places().forEach((place) => {
        const placeText = place.text();
        const offset = text.indexOf(placeText);
        if (offset !== -1) matches.push({
          type: "PLACE",
          text: placeText,
          start: offset,
          end: offset + placeText.length,
          confidence: 0.75,
          context: {
            sentence: this.getSentence(text, offset),
            tags: place.tags()
          }
        });
      });
      doc.dates().forEach((date) => {
        const dateText = date.text();
        const offset = text.indexOf(dateText);
        if (offset !== -1) matches.push({
          type: "DATE",
          text: dateText,
          start: offset,
          end: offset + dateText.length,
          confidence: 0.9,
          context: {
            sentence: this.getSentence(text, offset),
            tags: date.tags()
          }
        });
      });
      doc.money().forEach((m) => {
        const moneyText = m.text();
        const offset = text.indexOf(moneyText);
        if (offset !== -1) matches.push({
          type: "MONEY",
          text: moneyText,
          start: offset,
          end: offset + moneyText.length,
          confidence: 0.85,
          context: {
            sentence: this.getSentence(text, offset),
            tags: m.tags()
          }
        });
      });
      doc.match("#Email").forEach((email) => {
        const emailText = email.text();
        const offset = text.indexOf(emailText);
        if (offset !== -1) matches.push({
          type: "EMAIL",
          text: emailText,
          start: offset,
          end: offset + emailText.length,
          confidence: 0.95,
          context: { sentence: this.getSentence(text, offset) }
        });
      });
      doc.match("#PhoneNumber").forEach((phone) => {
        const phoneText = phone.text();
        const offset = text.indexOf(phoneText);
        if (offset !== -1) matches.push({
          type: "PHONE",
          text: phoneText,
          start: offset,
          end: offset + phoneText.length,
          confidence: 0.85,
          context: { sentence: this.getSentence(text, offset) }
        });
      });
      doc.match("#Url").forEach((url) => {
        const urlText = url.text();
        const offset = text.indexOf(urlText);
        if (offset !== -1) matches.push({
          type: "URL",
          text: urlText,
          start: offset,
          end: offset + urlText.length,
          confidence: 0.9,
          context: { sentence: this.getSentence(text, offset) }
        });
      });
    } catch (error) {
      console.warn("[NERDetector] Detection failed:", error);
      return [];
    }
    return this.deduplicateMatches(matches);
  }
  /**
  * Check if a regex match is confirmed by NER
  */
  isConfirmedByNER(regexMatch, nerMatches) {
    for (const nerMatch of nerMatches) if (this.calculateOverlap(regexMatch.start, regexMatch.end, nerMatch.start, nerMatch.end) > 0.5) return {
      confirmed: true,
      confidence: nerMatch.confidence
    };
    return { confirmed: false };
  }
  /**
  * Boost confidence of regex matches that are confirmed by NER
  */
  hybridDetection(regexMatches, text) {
    if (!this.available) return regexMatches.map((match) => ({
      ...match,
      nerConfirmed: false
    }));
    const nerMatches = this.detect(text);
    return regexMatches.map((match) => {
      const { confirmed, confidence: nerConfidence } = this.isConfirmedByNER(match, nerMatches);
      if (confirmed && nerConfidence) {
        const boostedConfidence = Math.min(1, match.confidence * 1.3);
        return {
          ...match,
          confidence: boostedConfidence,
          nerConfirmed: true,
          nerConfidence
        };
      }
      return {
        ...match,
        nerConfirmed: false
      };
    });
  }
  /**
  * Calculate overlap between two ranges (0-1)
  */
  calculateOverlap(start1, end1, start2, end2) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    if (overlapStart >= overlapEnd) return 0;
    return (overlapEnd - overlapStart) / Math.min(end1 - start1, end2 - start2);
  }
  /**
  * Remove duplicate NER matches
  */
  deduplicateMatches(matches) {
    const seen = /* @__PURE__ */ new Set();
    const unique = [];
    for (const match of matches) {
      const key = `${match.type}:${match.start}:${match.end}:${match.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(match);
      }
    }
    return unique;
  }
  /**
  * Extract sentence containing the match
  */
  getSentence(text, position) {
    const start = this.findSentenceStart(text, position);
    const end = this.findSentenceEnd(text, position);
    return text.substring(start, end).trim();
  }
  /**
  * Find start of sentence
  */
  findSentenceStart(text, pos) {
    for (let i = pos - 1; i >= 0; i--) {
      const char = text[i];
      if (char === "." || char === "!" || char === "?" || char === "\n") return i + 1;
    }
    return 0;
  }
  /**
  * Find end of sentence
  */
  findSentenceEnd(text, pos) {
    for (let i = pos; i < text.length; i++) {
      const char = text[i];
      if (char === "." || char === "!" || char === "?" || char === "\n") return i + 1;
    }
    return text.length;
  }
  /**
  * Extract additional NER-only detections (entities not caught by regex)
  */
  extractNEROnly(nerMatches, regexMatches) {
    const nerOnly = [];
    for (const nerMatch of nerMatches) if (!regexMatches.some((regexMatch) => {
      return this.calculateOverlap(regexMatch.start, regexMatch.end, nerMatch.start, nerMatch.end) > 0.3;
    })) nerOnly.push(nerMatch);
    return nerOnly;
  }
};
var DEFAULT_PROXIMITY_RULES = [
  {
    patternType: "EMAIL",
    keywords: [
      "email",
      "e-mail",
      "contact",
      "reach",
      "write",
      "send to"
    ],
    proximityWindow: 5,
    confidenceBoost: 0.2,
    keywordBefore: true,
    description: "Email preceded by email-related keywords"
  },
  {
    patternType: "EMAIL",
    keywords: [
      "example",
      "test",
      "sample",
      "demo"
    ],
    proximityWindow: 8,
    confidencePenalty: 0.25,
    description: "Email near test/example keywords"
  },
  {
    patternType: [
      "PHONE",
      "PHONE_UK",
      "PHONE_US",
      "PHONE_UK_MOBILE"
    ],
    keywords: [
      "call",
      "phone",
      "tel",
      "telephone",
      "mobile",
      "cell",
      "ring",
      "dial"
    ],
    proximityWindow: 5,
    confidenceBoost: 0.2,
    keywordBefore: true,
    description: "Phone number preceded by phone-related keywords"
  },
  {
    patternType: [
      "PHONE",
      "PHONE_UK",
      "PHONE_US"
    ],
    keywords: ["fax", "fax number"],
    proximityWindow: 5,
    confidencePenalty: 0.15,
    description: "Likely a fax number, not personal phone"
  },
  {
    patternType: "NAME",
    keywords: [
      "mr",
      "mrs",
      "ms",
      "miss",
      "dr",
      "prof",
      "professor",
      "dear",
      "hello",
      "hi"
    ],
    proximityWindow: 3,
    confidenceBoost: 0.25,
    keywordBefore: true,
    description: "Name preceded by salutation"
  },
  {
    patternType: "NAME",
    keywords: [
      "said",
      "wrote",
      "told",
      "asked",
      "replied",
      "mentioned",
      "stated"
    ],
    proximityWindow: 5,
    confidenceBoost: 0.15,
    keywordBefore: true,
    description: "Name preceded by speech verb"
  },
  {
    patternType: "NAME",
    keywords: [
      "the",
      "a",
      "an",
      "this",
      "that"
    ],
    proximityWindow: 1,
    confidencePenalty: 0.3,
    keywordBefore: true,
    description: "Preceded by article - likely not a name"
  },
  {
    patternType: "SSN",
    keywords: [
      "ssn",
      "social security",
      "social security number",
      "social-security"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.25,
    description: "SSN near SSN-related keywords"
  },
  {
    patternType: "SSN",
    keywords: [
      "example",
      "test",
      "sample",
      "123-45-6789",
      "000-00-0000"
    ],
    proximityWindow: 10,
    confidencePenalty: 0.4,
    description: "SSN near example/test keywords or obvious test SSN"
  },
  {
    patternType: [
      "BANK_ACCOUNT",
      "ACCOUNT_NUMBER",
      "IBAN",
      "SWIFT"
    ],
    keywords: [
      "account",
      "acct",
      "account number",
      "account#",
      "bank account"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.2,
    description: "Account number near account-related keywords"
  },
  {
    patternType: "CREDIT_CARD",
    keywords: [
      "card",
      "credit card",
      "debit card",
      "visa",
      "mastercard",
      "amex",
      "discover",
      "\u30AB\u30FC\u30C9",
      "\u30AF\u30EC\u30B8\u30C3\u30C8",
      "\u756A\u53F7"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.2,
    description: "Card number near card-related keywords"
  },
  {
    patternType: "CREDIT_CARD",
    keywords: [
      "test",
      "example",
      "4111",
      "4111111111111111"
    ],
    proximityWindow: 10,
    confidencePenalty: 0.35,
    description: "Near test card numbers"
  },
  {
    patternType: ["ADDRESS", "STREET_ADDRESS"],
    keywords: [
      "address",
      "street",
      "lives at",
      "located at",
      "residing at"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.15,
    description: "Address near address-related keywords"
  },
  {
    patternType: [
      "MRN",
      "PATIENT_ID",
      "NHS_NUMBER",
      "MEDICAL_RECORD"
    ],
    keywords: [
      "patient",
      "subject",
      "participant",
      "mrn",
      "medical record"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.25,
    description: "Medical ID near medical keywords"
  },
  {
    patternType: "DATE_OF_BIRTH",
    keywords: [
      "dob",
      "date of birth",
      "birth date",
      "birthdate",
      "born",
      "birthday"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.25,
    description: "DOB near birth-related keywords"
  },
  {
    patternType: "PASSPORT",
    keywords: [
      "passport",
      "passport number",
      "passport#"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.2,
    description: "Passport near passport keywords"
  },
  {
    patternType: ["DRIVERS_LICENSE", "DRIVING_LICENCE"],
    keywords: [
      "license",
      "licence",
      "driver",
      "driving",
      "dl#",
      "dl number"
    ],
    proximityWindow: 8,
    confidenceBoost: 0.2,
    description: "License near license keywords"
  }
];
var DEFAULT_DOMAIN_VOCABULARIES = [
  {
    domain: "medical",
    terms: [
      "patient",
      "doctor",
      "physician",
      "nurse",
      "hospital",
      "clinic",
      "medical",
      "health",
      "diagnosis",
      "treatment",
      "prescription",
      "medication",
      "surgery",
      "exam",
      "test",
      "lab",
      "specimen",
      "chart",
      "record",
      "mrn",
      "hipaa",
      "healthcare",
      "practitioner",
      "provider",
      "pharmacy",
      "radiology"
    ],
    boostPatterns: [
      "MRN",
      "PATIENT_ID",
      "NHS_NUMBER",
      "NPI",
      "DEA",
      "MEDICAL"
    ],
    boostAmount: 0.15
  },
  {
    domain: "legal",
    terms: [
      "case",
      "court",
      "judge",
      "attorney",
      "lawyer",
      "counsel",
      "plaintiff",
      "defendant",
      "lawsuit",
      "litigation",
      "docket",
      "tribunal",
      "hearing",
      "deposition",
      "subpoena",
      "warrant",
      "verdict",
      "settlement",
      "contract",
      "agreement",
      "legal",
      "law",
      "bar number",
      "case number"
    ],
    boostPatterns: [
      "CASE_NUMBER",
      "DOCKET",
      "BAR_NUMBER",
      "LEGAL"
    ],
    boostAmount: 0.15
  },
  {
    domain: "financial",
    terms: [
      "bank",
      "account",
      "payment",
      "transaction",
      "transfer",
      "wire",
      "credit",
      "debit",
      "balance",
      "deposit",
      "withdrawal",
      "loan",
      "mortgage",
      "investment",
      "trading",
      "stock",
      "bond",
      "portfolio",
      "iban",
      "swift",
      "routing",
      "bic",
      "ach",
      "financial",
      "finance",
      "money",
      "currency",
      "crypto"
    ],
    boostPatterns: [
      "BANK_ACCOUNT",
      "IBAN",
      "SWIFT",
      "ROUTING",
      "CREDIT_CARD",
      "BITCOIN"
    ],
    boostAmount: 0.15
  },
  {
    domain: "hr",
    terms: [
      "employee",
      "staff",
      "personnel",
      "workforce",
      "human resources",
      "hr",
      "payroll",
      "salary",
      "compensation",
      "benefits",
      "onboarding",
      "offboarding",
      "termination",
      "resignation",
      "promotion",
      "performance",
      "review",
      "evaluation",
      "disciplinary",
      "complaint",
      "grievance",
      "harassment"
    ],
    boostPatterns: [
      "EMPLOYEE_ID",
      "PAYROLL",
      "HR"
    ],
    boostAmount: 0.15
  },
  {
    domain: "technical",
    terms: [
      "api",
      "key",
      "token",
      "secret",
      "password",
      "credential",
      "auth",
      "authentication",
      "authorization",
      "oauth",
      "jwt",
      "bearer",
      "session",
      "access",
      "refresh",
      "client",
      "server",
      "endpoint",
      "webhook",
      "sdk"
    ],
    boostPatterns: [
      "API_KEY",
      "JWT",
      "BEARER_TOKEN",
      "AWS_ACCESS_KEY",
      "SECRET"
    ],
    boostAmount: 0.2
  }
];
var ContextRulesEngine = class {
  constructor(config) {
    const useDefaults = config?.useDefaultRules !== false;
    this.proximityRules = [...useDefaults ? DEFAULT_PROXIMITY_RULES : [], ...config?.proximityRules || []];
    this.domainVocabularies = [...useDefaults ? DEFAULT_DOMAIN_VOCABULARIES : [], ...config?.domainVocabularies || []];
  }
  /**
  * Apply proximity rules to adjust confidence
  */
  applyProximityRules(match, text) {
    let adjustedConfidence = match.confidence;
    const applicableRules = this.proximityRules.filter((rule) => {
      if (Array.isArray(rule.patternType)) return rule.patternType.some((type) => match.type.includes(type));
      return match.type.includes(rule.patternType);
    });
    for (const rule of applicableRules) if (this.checkProximity(text, match.start, match.end, rule.keywords, rule.proximityWindow || 10, rule.keywordBefore, rule.keywordAfter)) {
      if (rule.confidenceBoost) adjustedConfidence += rule.confidenceBoost;
      if (rule.confidencePenalty) adjustedConfidence -= rule.confidencePenalty;
    }
    adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));
    return {
      ...match,
      confidence: adjustedConfidence
    };
  }
  /**
  * Apply domain vocabulary boosting
  */
  applyDomainBoosting(matches, text) {
    const detectedDomains = this.detectDomains(text);
    if (detectedDomains.length === 0) return matches;
    return matches.map((match) => {
      let boosted = false;
      let adjustedConfidence = match.confidence;
      for (const domain of detectedDomains) {
        const vocabulary = this.domainVocabularies.find((v) => v.domain === domain);
        if (vocabulary && vocabulary.boostPatterns) {
          if (vocabulary.boostPatterns.some((pattern) => match.type.includes(pattern))) {
            adjustedConfidence += vocabulary.boostAmount || 0.15;
            boosted = true;
          }
        }
      }
      if (boosted) return {
        ...match,
        confidence: Math.min(1, adjustedConfidence)
      };
      return match;
    });
  }
  /**
  * Check if keywords are within proximity window
  */
  checkProximity(text, matchStart, matchEnd, keywords, proximityWindow, keywordBefore, keywordAfter) {
    const beforeText = text.substring(Math.max(0, matchStart - 500), matchStart);
    const afterText = text.substring(matchEnd, Math.min(text.length, matchEnd + 500));
    const beforeWords = beforeText.split(/\s+/).filter((w) => w.length > 0);
    const afterWords = afterText.split(/\s+/).filter((w) => w.length > 0);
    const beforeWindowWords = beforeWords.slice(-proximityWindow);
    const afterWindowWords = afterWords.slice(0, proximityWindow);
    const beforeLower = beforeWindowWords.join(" ").toLowerCase();
    const afterLower = afterWindowWords.join(" ").toLowerCase();
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (keywordBefore && beforeLower.includes(keywordLower)) return true;
      if (keywordAfter && afterLower.includes(keywordLower)) return true;
      if (!keywordBefore && !keywordAfter) {
        if (beforeLower.includes(keywordLower) || afterLower.includes(keywordLower)) return true;
      }
    }
    return false;
  }
  /**
  * Detect which domains the text belongs to
  */
  detectDomains(text) {
    const textLower = text.toLowerCase();
    const detectedDomains = [];
    for (const vocabulary of this.domainVocabularies) {
      let termCount = 0;
      for (const term of vocabulary.terms) if (textLower.includes(term.toLowerCase())) termCount++;
      if (termCount >= 3) detectedDomains.push(vocabulary.domain);
    }
    return detectedDomains;
  }
  /**
  * Add custom proximity rule
  */
  addProximityRule(rule) {
    this.proximityRules.push(rule);
  }
  /**
  * Add custom domain vocabulary
  */
  addDomainVocabulary(vocabulary) {
    this.domainVocabularies.push(vocabulary);
  }
  /**
  * Get all proximity rules
  */
  getProximityRules() {
    return [...this.proximityRules];
  }
  /**
  * Get all domain vocabularies
  */
  getDomainVocabularies() {
    return [...this.domainVocabularies];
  }
};
var DEFAULT_SEVERITY_MAP = {
  "SSN": "critical",
  "SOCIAL_SECURITY": "critical",
  "CREDIT_CARD": "critical",
  "CVV": "critical",
  "BANK_ACCOUNT": "critical",
  "ROUTING_NUMBER": "critical",
  "PASSPORT": "critical",
  "DRIVERS_LICENSE": "critical",
  "DRIVING_LICENCE": "critical",
  "NHS_NUMBER": "critical",
  "NI_NUMBER": "critical",
  "NATIONAL_INSURANCE": "critical",
  "TAX_ID": "critical",
  "EIN": "critical",
  "ITIN": "critical",
  "SIN": "critical",
  "TFN": "critical",
  "AADHAAR": "critical",
  "MEDICAL_RECORD": "critical",
  "MRN": "critical",
  "PATIENT_ID": "critical",
  "DEA_NUMBER": "critical",
  "NPI": "critical",
  "API_KEY": "critical",
  "SECRET_KEY": "critical",
  "AWS_SECRET_KEY": "critical",
  "PRIVATE_KEY": "critical",
  "SSH_KEY": "critical",
  "JWT": "critical",
  "OAUTH_SECRET": "critical",
  "PASSWORD": "critical",
  "BEARER_TOKEN": "critical",
  "BITCOIN_PRIVATE": "critical",
  "EMAIL": "high",
  "PHONE": "high",
  "PHONE_UK": "high",
  "PHONE_US": "high",
  "PHONE_MOBILE": "high",
  "NAME": "high",
  "FULL_NAME": "high",
  "DATE_OF_BIRTH": "high",
  "DOB": "high",
  "ADDRESS": "high",
  "STREET_ADDRESS": "high",
  "IBAN": "high",
  "SWIFT": "high",
  "BIC": "high",
  "IFSC": "high",
  "CLABE": "high",
  "IP_ADDRESS": "high",
  "MAC_ADDRESS": "high",
  "VEHICLE_VIN": "high",
  "LICENSE_PLATE": "high",
  "GITHUB_TOKEN": "high",
  "AWS_ACCESS_KEY": "high",
  "STRIPE_KEY": "high",
  "GOOGLE_API_KEY": "high",
  "OPENAI_API_KEY": "high",
  "PRESCRIPTION": "high",
  "BIOMETRIC": "high",
  "EMPLOYEE_ID": "medium",
  "USERNAME": "medium",
  "COMPANY_NUMBER": "medium",
  "VAT_NUMBER": "medium",
  "UTR": "medium",
  "ORDER_NUMBER": "medium",
  "INVOICE_NUMBER": "medium",
  "ACCOUNT_NUMBER": "medium",
  "CUSTOMER_ID": "medium",
  "TRANSACTION_ID": "medium",
  "CASE_NUMBER": "medium",
  "DOCKET_NUMBER": "medium",
  "BAR_NUMBER": "medium",
  "TRACKING_NUMBER": "medium",
  "SESSION_ID": "medium",
  "DEVICE_ID": "medium",
  "CERTIFICATE_NUMBER": "medium",
  "POLICY_NUMBER": "medium",
  "MEMBERSHIP_ID": "medium",
  "LOYALTY_CARD": "medium",
  "GIFT_CARD": "medium",
  "BITCOIN_ADDRESS": "medium",
  "ETHEREUM_ADDRESS": "medium",
  "CRYPTOCURRENCY": "medium",
  "POSTCODE": "low",
  "ZIP_CODE": "low",
  "POSTAL_CODE": "low",
  "URL": "low",
  "DOMAIN": "low",
  "ORGANIZATION": "low",
  "COMPANY": "low",
  "PRODUCT_SKU": "low",
  "COUPON_CODE": "low",
  "PROMO_CODE": "low",
  "PLACEHOLDER": "low"
};
var SEVERITY_SCORES = {
  "critical": 10,
  "high": 7,
  "medium": 4,
  "low": 2
};
var SeverityClassifier = class {
  constructor(customMap) {
    this.severityMap = {
      ...DEFAULT_SEVERITY_MAP,
      ...customMap || {}
    };
  }
  /**
  * Classify severity for a pattern type
  */
  classify(patternType) {
    if (this.severityMap[patternType]) return {
      level: this.severityMap[patternType],
      score: SEVERITY_SCORES[this.severityMap[patternType]],
      reason: `Mapped severity for ${patternType}`
    };
    for (const [key, severity] of Object.entries(this.severityMap)) if (patternType.includes(key) || key.includes(patternType)) return {
      level: severity,
      score: SEVERITY_SCORES[severity],
      reason: `Partial match: ${patternType} \u2248 ${key}`
    };
    return {
      level: "medium",
      score: SEVERITY_SCORES["medium"],
      reason: `Unknown pattern type, defaulting to medium`
    };
  }
  /**
  * Ensure pattern has severity assigned
  */
  ensurePatternSeverity(pattern) {
    if (pattern.severity) return pattern;
    const classification = this.classify(pattern.type);
    return {
      ...pattern,
      severity: classification.level
    };
  }
  /**
  * Ensure all patterns have severity
  */
  ensureAllSeverity(patterns) {
    return patterns.map((p) => this.ensurePatternSeverity(p));
  }
  /**
  * Calculate risk score for a set of detections
  */
  calculateRiskScore(detections) {
    if (detections.length === 0) return {
      score: 0,
      level: "minimal",
      factors: {
        piiCount: 0,
        avgSeverity: 0,
        avgConfidence: 0,
        criticalCount: 0,
        highCount: 0
      }
    };
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalConfidence = 0;
    let totalSeverityScore = 0;
    for (const detection of detections) {
      if (detection.severity === "critical") criticalCount++;
      else if (detection.severity === "high") highCount++;
      else if (detection.severity === "medium") mediumCount++;
      else if (detection.severity === "low") lowCount++;
      totalConfidence += detection.confidence || 0.8;
      totalSeverityScore += SEVERITY_SCORES[detection.severity];
    }
    const avgConfidence = totalConfidence / detections.length;
    const avgSeverity = totalSeverityScore / detections.length;
    const countFactor = Math.min(detections.length / 10, 1);
    const severityFactor = avgSeverity / 10;
    const criticalFactor = Math.min(criticalCount / 5, 1);
    const confidenceFactor = avgConfidence;
    const riskScore = 0.3 * countFactor + 0.3 * severityFactor + 0.3 * criticalFactor + 0.1 * confidenceFactor;
    const clampedScore = Math.max(0, Math.min(1, riskScore));
    let level;
    if (clampedScore >= 0.8) level = "very-high";
    else if (clampedScore >= 0.6) level = "high";
    else if (clampedScore >= 0.4) level = "medium";
    else if (clampedScore >= 0.2) level = "low";
    else level = "minimal";
    return {
      score: clampedScore,
      level,
      factors: {
        piiCount: detections.length,
        avgSeverity,
        avgConfidence,
        criticalCount,
        highCount
      }
    };
  }
  /**
  * Get severity for a pattern type
  */
  getSeverity(patternType) {
    return this.classify(patternType).level;
  }
  /**
  * Get severity score for a pattern type
  */
  getSeverityScore(patternType) {
    return this.classify(patternType).score;
  }
  /**
  * Add custom severity mapping
  */
  addSeverityMapping(patternType, severity) {
    this.severityMap[patternType] = severity;
  }
  /**
  * Get all severity mappings
  */
  getSeverityMap() {
    return { ...this.severityMap };
  }
  /**
  * Filter detections by severity threshold
  */
  filterBySeverity(detections, minSeverity) {
    const minScore = SEVERITY_SCORES[minSeverity];
    return detections.filter((detection) => {
      return SEVERITY_SCORES[detection.severity] >= minScore;
    });
  }
  /**
  * Group detections by severity
  */
  groupBySeverity(detections) {
    const grouped = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    for (const detection of detections) grouped[detection.severity].push(detection);
    return grouped;
  }
};
var LRUCache = class {
  constructor(maxSize = 100) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
  }
  get(key) {
    const value = this.cache.get(key);
    if (value !== void 0) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  has(key) {
    return this.cache.has(key);
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
};
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
var ExplainAPI = class {
  constructor(detector2) {
    this.detector = detector2;
    this.patterns = detector2.getPatterns();
    const detectorOptions = detector2.options;
    this.options = {
      enableContextAnalysis: detectorOptions?.enableContextAnalysis || false,
      confidenceThreshold: detectorOptions?.confidenceThreshold || 0.5,
      enableFalsePositiveFilter: detectorOptions?.enableFalsePositiveFilter || false,
      falsePositiveThreshold: detectorOptions?.falsePositiveThreshold || 0.7,
      whitelist: detectorOptions?.whitelist || []
    };
  }
  /**
  * Explain why text was or wasn't detected as PII
  */
  async explain(text) {
    const patternResults = [];
    const matchedPatterns = [];
    const unmatchedPatterns = [];
    const filteredPatterns = [];
    for (const pattern of this.patterns) {
      const match = new RegExp(pattern.regex.source, pattern.regex.flags).exec(text);
      if (!match) {
        const result2 = {
          pattern,
          matched: false,
          reason: "Pattern regex did not match text"
        };
        patternResults.push(result2);
        unmatchedPatterns.push(result2);
        continue;
      }
      const value = match[1] !== void 0 ? match[1] : match[0];
      const fullMatch = match[0];
      let startPos;
      let endPos;
      if (match[1] !== void 0) {
        const captureIndex = fullMatch.indexOf(value);
        startPos = match.index + captureIndex;
        endPos = startPos + value.length;
      } else {
        startPos = match.index;
        endPos = startPos + value.length;
      }
      const contextStart = Math.max(0, startPos - 50);
      const contextEnd = Math.min(text.length, endPos + 50);
      const context = text.substring(contextStart, contextEnd);
      const result = {
        pattern,
        matched: true,
        matchedValue: value,
        position: [startPos, endPos]
      };
      if (pattern.validator) {
        const validatorResult = pattern.validator(value, context);
        result.validatorPassed = validatorResult;
        if (!validatorResult) {
          result.reason = "Failed pattern validator";
          patternResults.push(result);
          filteredPatterns.push(result);
          continue;
        }
      }
      if (this.options.enableFalsePositiveFilter) {
        const fpResult = isFalsePositive(value, pattern.type, context);
        result.falsePositiveCheck = {
          isFalsePositive: fpResult.isFalsePositive,
          confidence: fpResult.confidence,
          reason: fpResult.matchedRule?.description
        };
        if (fpResult.isFalsePositive && fpResult.confidence >= this.options.falsePositiveThreshold) {
          result.reason = `Filtered as false positive: ${fpResult.matchedRule?.description || "Unknown reason"}`;
          patternResults.push(result);
          filteredPatterns.push(result);
          continue;
        }
      }
      if (this.options.enableContextAnalysis) {
        const contextAnalysis = analyzeFullContext(text, value, pattern.type, startPos, endPos);
        result.contextAnalysis = contextAnalysis;
        if (contextAnalysis.confidence < this.options.confidenceThreshold) {
          result.reason = `Low confidence (${(contextAnalysis.confidence * 100).toFixed(1)}% < ${this.options.confidenceThreshold * 100}% threshold)`;
          patternResults.push(result);
          filteredPatterns.push(result);
          continue;
        }
      }
      if (this.options.whitelist.some((term) => value.toLowerCase().includes(term.toLowerCase()))) {
        result.reason = "Matched whitelist term";
        patternResults.push(result);
        filteredPatterns.push(result);
        continue;
      }
      patternResults.push(result);
      matchedPatterns.push(result);
    }
    const detections = (await this.detector.detect(text)).detections;
    return {
      text,
      patternResults,
      matchedPatterns,
      unmatchedPatterns,
      filteredPatterns,
      detections,
      summary: {
        totalPatternsChecked: this.patterns.length,
        patternsMatched: matchedPatterns.length,
        patternsFiltered: filteredPatterns.length,
        finalDetections: detections.length
      }
    };
  }
  /**
  * Explain a specific detection
  */
  async explainDetection(detection, text) {
    const pattern = this.patterns.find((p) => p.type === detection.type);
    const reasoning = [];
    reasoning.push(`Detected as ${detection.type}`);
    reasoning.push(`Severity: ${detection.severity}`);
    if (detection.confidence !== void 0) reasoning.push(`Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
    if (pattern) {
      reasoning.push(`Matched pattern: ${pattern.description || pattern.type}`);
      reasoning.push(`Pattern priority: ${pattern.priority}`);
    }
    let contextAnalysis;
    if (detection.confidence !== void 0) {
      const [start, end] = detection.position;
      contextAnalysis = analyzeFullContext(text, detection.value, detection.type, start, end);
      if (contextAnalysis) {
        reasoning.push(`Document type: ${contextAnalysis.documentType}`);
        reasoning.push(`Context confidence: ${(contextAnalysis.confidence * 100).toFixed(1)}%`);
      }
    }
    return {
      detection,
      pattern,
      contextAnalysis,
      reasoning,
      suggestions: []
    };
  }
  /**
  * Suggest why text wasn't detected
  */
  async suggestWhy(text, expectedType) {
    const suggestions = [];
    const similarPatterns = [];
    const typePatterns = this.patterns.filter((p) => p.type === expectedType || p.type.includes(expectedType));
    if (typePatterns.length === 0) {
      suggestions.push(`No patterns found for type: ${expectedType}`);
      suggestions.push("Available types: " + [...new Set(this.patterns.map((p) => p.type))].join(", "));
      return {
        text,
        expectedType,
        suggestions,
        similarPatterns
      };
    }
    for (const pattern of typePatterns) {
      const match = new RegExp(pattern.regex.source, pattern.regex.flags).exec(text);
      if (match) {
        similarPatterns.push(pattern);
        const value = match[1] !== void 0 ? match[1] : match[0];
        suggestions.push(`Pattern "${pattern.type}" matched value: "${value}"`);
        const filtered = (await this.explain(text)).filteredPatterns.find((r) => r.pattern.type === pattern.type);
        if (filtered && filtered.reason) suggestions.push(`But was filtered: ${filtered.reason}`);
      }
    }
    if (similarPatterns.length === 0) {
      suggestions.push(`Text didn't match any ${expectedType} patterns`);
      suggestions.push("Possible reasons:");
      suggestions.push("  - Format doesn't match expected pattern");
      suggestions.push("  - Contains invalid characters");
      suggestions.push("  - Fails validation checks");
      suggestions.push("  - Too short or too long");
      if (typePatterns.length > 0) {
        const examplePattern = typePatterns[0];
        suggestions.push(`
Example ${expectedType} pattern: ${examplePattern.regex.source.substring(0, 100)}...`);
      }
    }
    return {
      text,
      expectedType,
      suggestions,
      similarPatterns
    };
  }
  /**
  * Get debugging information for entire detection process
  */
  async debug(text) {
    const start = performance.now();
    const explanation = await this.explain(text);
    const duration = performance.now() - start;
    const enabledFeatures = [];
    if (this.options.enableContextAnalysis) enabledFeatures.push("Context Analysis");
    if (this.options.enableFalsePositiveFilter) enabledFeatures.push("False Positive Filter");
    if (this.options.whitelist.length > 0) enabledFeatures.push(`Whitelist (${this.options.whitelist.length} entries)`);
    return {
      text,
      textLength: text.length,
      enabledFeatures,
      patternCount: this.patterns.length,
      explanation,
      performance: { estimatedTime: `${duration.toFixed(2)}ms` }
    };
  }
};
function createExplainAPI(detector2) {
  return new ExplainAPI(detector2);
}
var ReportGenerator = class {
  constructor(_detector) {
  }
  /**
  * Generate a report from detection results
  */
  generate(result, options) {
    const opts = {
      format: options.format,
      type: options.type || "summary",
      title: options.title || "PII Detection Report",
      includeOriginalText: options.includeOriginalText ?? false,
      includeRedactedText: options.includeRedactedText ?? true,
      includeDetectionDetails: options.includeDetectionDetails ?? true,
      includeStatistics: options.includeStatistics ?? true,
      includeExplanation: options.includeExplanation ?? false,
      organizationName: options.organizationName || "Organization",
      metadata: options.metadata || {}
    };
    if (opts.format === "html") return this.generateHTML(result, opts);
    else return this.generateMarkdown(result, opts);
  }
  /**
  * Generate HTML report
  */
  generateHTML(result, options) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const stats = this.calculateStatistics(result);
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(options.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 8px;
    }
    h3 {
      color: #7f8c8d;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .meta {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 0.9em;
    }
    .meta-item {
      margin: 5px 0;
    }
    .meta-label {
      font-weight: 600;
      color: #34495e;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .stat-card.success {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .detection-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .detection-table th,
    .detection-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    .detection-table th {
      background: #34495e;
      color: white;
      font-weight: 600;
    }
    .detection-table tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-high {
      background: #e74c3c;
      color: white;
    }
    .badge-medium {
      background: #f39c12;
      color: white;
    }
    .badge-low {
      background: #3498db;
      color: white;
    }
    .text-box {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 20px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .highlight {
      background: #f39c12;
      color: #2c3e50;
      padding: 2px 4px;
      border-radius: 2px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ecf0f1;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${this.escapeHtml(options.title)}</h1>

    <div class="meta">
      <div class="meta-item">
        <span class="meta-label">Generated:</span> ${timestamp}
      </div>
      <div class="meta-item">
        <span class="meta-label">Organization:</span> ${this.escapeHtml(options.organizationName)}
      </div>
`;
    for (const [key, value] of Object.entries(options.metadata)) html += `      <div class="meta-item">
        <span class="meta-label">${this.escapeHtml(key)}:</span> ${this.escapeHtml(value)}
      </div>
`;
    html += `    </div>
`;
    if (options.includeStatistics) {
      html += `
    <h2>Summary Statistics</h2>
    <div class="stats">
      <div class="stat-card ${stats.totalDetections > 0 ? "warning" : "success"}">
        <div class="stat-value">${stats.totalDetections}</div>
        <div class="stat-label">PII Detected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.uniqueTypes}</div>
        <div class="stat-label">Unique Types</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.highSeverity}</div>
        <div class="stat-label">High Severity</div>
      </div>
      ${result.stats?.processingTime ? `
      <div class="stat-card success">
        <div class="stat-value">${result.stats.processingTime}ms</div>
        <div class="stat-label">Processing Time</div>
      </div>` : ""}
    </div>
`;
      html += `
    <h3>Detection Breakdown</h3>
    <table class="detection-table">
      <thead>
        <tr>
          <th>PII Type</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
`;
      for (const [type, count] of Object.entries(stats.typeBreakdown)) {
        const percentage = (count / stats.totalDetections * 100).toFixed(1);
        html += `        <tr>
          <td>${this.escapeHtml(type)}</td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
`;
      }
      html += `      </tbody>
    </table>
`;
    }
    if (options.includeDetectionDetails && result.detections.length > 0) {
      html += `
    <h2>Detection Details</h2>
    <table class="detection-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Value</th>
          <th>Position</th>
          <th>Severity</th>
          ${result.detections[0].confidence !== void 0 ? "<th>Confidence</th>" : ""}
        </tr>
      </thead>
      <tbody>
`;
      for (const detection of result.detections) {
        const severityClass = detection.severity === "high" ? "badge-high" : detection.severity === "medium" ? "badge-medium" : "badge-low";
        html += `        <tr>
          <td>${this.escapeHtml(detection.type)}</td>
          <td><code>${this.escapeHtml(detection.value)}</code></td>
          <td>${detection.position[0]}-${detection.position[1]}</td>
          <td><span class="badge ${severityClass}">${detection.severity.toUpperCase()}</span></td>
          ${detection.confidence !== void 0 ? `<td>${(detection.confidence * 100).toFixed(1)}%</td>` : ""}
        </tr>
`;
      }
      html += `      </tbody>
    </table>
`;
    }
    if (options.includeRedactedText) html += `
    <h2>Redacted Text</h2>
    <div class="text-box">${this.escapeHtml(result.redacted)}</div>
`;
    if (options.includeOriginalText) html += `
    <h2>Original Text (Sensitive)</h2>
    <div class="text-box">${this.escapeHtml(result.original)}</div>
`;
    html += `
    <div class="footer">
      <p>Generated by OpenRedaction - Production-ready PII detection library</p>
      <p>Report Type: ${options.type.toUpperCase()} | Format: HTML</p>
    </div>
  </div>
</body>
</html>`;
    return html;
  }
  /**
  * Generate Markdown report
  */
  generateMarkdown(result, options) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const stats = this.calculateStatistics(result);
    let md = `# ${options.title}

`;
    md += `## Metadata

`;
    md += `- **Generated:** ${timestamp}
`;
    md += `- **Organization:** ${options.organizationName}
`;
    for (const [key, value] of Object.entries(options.metadata)) md += `- **${key}:** ${value}
`;
    md += `
`;
    if (options.includeStatistics) {
      md += `## Summary Statistics

`;
      md += `| Metric | Value |
`;
      md += `|--------|-------|
`;
      md += `| Total PII Detected | ${stats.totalDetections} |
`;
      md += `| Unique Types | ${stats.uniqueTypes} |
`;
      md += `| High Severity | ${stats.highSeverity} |
`;
      if (result.stats?.processingTime) md += `| Processing Time | ${result.stats.processingTime}ms |
`;
      md += `
`;
      md += `### Detection Breakdown

`;
      md += `| PII Type | Count | Percentage |
`;
      md += `|----------|-------|------------|
`;
      for (const [type, count] of Object.entries(stats.typeBreakdown)) {
        const percentage = (count / stats.totalDetections * 100).toFixed(1);
        md += `| ${type} | ${count} | ${percentage}% |
`;
      }
      md += `
`;
    }
    if (options.includeDetectionDetails && result.detections.length > 0) {
      md += `## Detection Details

`;
      md += `| Type | Value | Position | Severity |${result.detections[0].confidence !== void 0 ? " Confidence |" : ""}
`;
      md += `|------|-------|----------|----------|${result.detections[0].confidence !== void 0 ? "------------|" : ""}
`;
      for (const detection of result.detections) {
        md += `| ${detection.type} | \`${detection.value}\` | ${detection.position[0]}-${detection.position[1]} | ${detection.severity.toUpperCase()} |`;
        if (detection.confidence !== void 0) md += ` ${(detection.confidence * 100).toFixed(1)}% |`;
        md += `
`;
      }
      md += `
`;
    }
    if (options.includeRedactedText) {
      md += `## Redacted Text

`;
      md += `\`\`\`
${result.redacted}
\`\`\`

`;
    }
    if (options.includeOriginalText) {
      md += `## Original Text (Sensitive)

`;
      md += `\u26A0\uFE0F **WARNING:** This section contains unredacted sensitive data.

`;
      md += `\`\`\`
${result.original}
\`\`\`

`;
    }
    md += `---

`;
    md += `*Generated by OpenRedaction - Production-ready PII detection library*
`;
    md += `*Report Type: ${options.type.toUpperCase()} | Format: MARKDOWN*
`;
    return md;
  }
  /**
  * Calculate statistics from detection results
  */
  calculateStatistics(result) {
    const typeBreakdown = {};
    let highSeverity = 0;
    for (const detection of result.detections) {
      typeBreakdown[detection.type] = (typeBreakdown[detection.type] || 0) + 1;
      if (detection.severity === "high") highSeverity++;
    }
    return {
      totalDetections: result.detections.length,
      uniqueTypes: Object.keys(typeBreakdown).length,
      highSeverity,
      typeBreakdown
    };
  }
  /**
  * Escape HTML special characters
  */
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
};
function createReportGenerator(detector2) {
  return new ReportGenerator(detector2);
}
var PriorityOptimizer = class {
  constructor(learningStore, options = {}) {
    this.learningStore = learningStore;
    this.options = {
      learningWeight: options.learningWeight ?? 0.3,
      minSampleSize: options.minSampleSize ?? 10,
      maxPriorityAdjustment: options.maxPriorityAdjustment ?? 15
    };
  }
  /**
  * Optimize pattern priorities based on learning data
  */
  optimizePatterns(patterns) {
    const whitelistEntries = this.learningStore.getWhitelistEntries();
    const patternAdjustments = this.learningStore.getAllPatternAdjustments();
    const fpCountByType = /* @__PURE__ */ new Map();
    for (const entry of whitelistEntries) {
      const occurrences = entry.occurrences;
      const inferredType = this.inferPatternType(entry.pattern);
      if (inferredType) fpCountByType.set(inferredType, (fpCountByType.get(inferredType) || 0) + occurrences);
    }
    const fnCountByType = /* @__PURE__ */ new Map();
    for (const adjustment of patternAdjustments) fnCountByType.set(adjustment.type, (fnCountByType.get(adjustment.type) || 0) + adjustment.occurrences);
    const totalDetectionsByType = /* @__PURE__ */ new Map();
    for (const pattern of patterns) {
      const fpCount = fpCountByType.get(pattern.type) || 0;
      const fnCount = fnCountByType.get(pattern.type) || 0;
      const estimated = Math.max(fpCount + fnCount + 10, 1);
      totalDetectionsByType.set(pattern.type, estimated);
    }
    return patterns.map((pattern) => {
      const fpCount = fpCountByType.get(pattern.type) || 0;
      const fnCount = fnCountByType.get(pattern.type) || 0;
      const totalDetections = totalDetectionsByType.get(pattern.type) || 1;
      if (totalDetections < this.options.minSampleSize) return pattern;
      let adjustment = 0;
      const fpRate = fpCount / totalDetections;
      if (fpRate > 0.1) adjustment -= fpRate * this.options.maxPriorityAdjustment;
      const fnRate = fnCount / totalDetections;
      if (fnRate > 0.1) adjustment += fnRate * this.options.maxPriorityAdjustment;
      adjustment *= this.options.learningWeight;
      adjustment = Math.max(-this.options.maxPriorityAdjustment, Math.min(this.options.maxPriorityAdjustment, adjustment));
      const newPriority = Math.max(0, Math.min(100, pattern.priority + adjustment));
      if (Math.abs(adjustment) > 1) return {
        ...pattern,
        priority: Math.round(newPriority)
      };
      return pattern;
    });
  }
  /**
  * Get pattern statistics with learning data
  */
  getPatternStats(patterns) {
    const whitelistEntries = this.learningStore.getWhitelistEntries();
    const patternAdjustments = this.learningStore.getAllPatternAdjustments();
    const fpCountByType = /* @__PURE__ */ new Map();
    for (const entry of whitelistEntries) {
      const inferredType = this.inferPatternType(entry.pattern);
      if (inferredType) fpCountByType.set(inferredType, (fpCountByType.get(inferredType) || 0) + entry.occurrences);
    }
    const fnCountByType = /* @__PURE__ */ new Map();
    for (const adjustment of patternAdjustments) fnCountByType.set(adjustment.type, (fnCountByType.get(adjustment.type) || 0) + adjustment.occurrences);
    return patterns.map((pattern) => {
      const fpCount = fpCountByType.get(pattern.type) || 0;
      const fnCount = fnCountByType.get(pattern.type) || 0;
      const totalDetections = Math.max(fpCount + fnCount + 10, 1);
      const accuracy = (totalDetections - (fpCount + fnCount)) / totalDetections;
      return {
        type: pattern.type,
        totalDetections,
        falsePositives: fpCount,
        falseNegatives: fnCount,
        accuracy,
        priority: pattern.priority,
        adjustedPriority: pattern.priority
      };
    });
  }
  /**
  * Infer pattern type from a whitelisted value
  * This is a heuristic - in production we'd track this explicitly
  */
  inferPatternType(value) {
    if (/@/.test(value)) return "EMAIL";
    if (/^\+?\d[\d\s\-()]{7,}$/.test(value)) return "PHONE";
    if (/^\d{3}-\d{2}-\d{4}$/.test(value)) return "SSN";
    if (/^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value)) return "CREDIT_CARD";
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return "IP_ADDRESS";
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(value)) return "NAME";
    return null;
  }
  /**
  * Reset all priority adjustments
  */
  resetPriorities(patterns) {
    return patterns;
  }
  /**
  * Get optimizer configuration
  */
  getOptions() {
    return { ...this.options };
  }
  /**
  * Update optimizer configuration
  */
  setOptions(options) {
    this.options = {
      ...this.options,
      ...options
    };
  }
};
function createPriorityOptimizer(learningStore, options) {
  return new PriorityOptimizer(learningStore, options);
}
var OpenRedactionError = class OpenRedactionError2 extends Error {
  constructor(message, code = "OPENREDACTION_ERROR", suggestion, context) {
    super(message);
    this.name = "OpenRedactionError";
    this.code = code;
    this.suggestion = suggestion;
    this.context = context;
    if (Error.captureStackTrace) Error.captureStackTrace(this, OpenRedactionError2);
  }
  /**
  * Get formatted error message with suggestions
  */
  getFormattedMessage() {
    let formatted = `[${this.code}] ${this.message}`;
    if (this.suggestion) {
      formatted += `

Suggestion: ${this.suggestion.message}`;
      if (this.suggestion.code) formatted += `

Try:
${this.suggestion.code}`;
      if (this.suggestion.docs) formatted += `

Docs: ${this.suggestion.docs}`;
    }
    if (this.context && Object.keys(this.context).length > 0) formatted += `

Context: ${JSON.stringify(this.context, null, 2)}`;
    return formatted;
  }
};
function createLearningDisabledError() {
  return new OpenRedactionError("Learning system is disabled", "LEARNING_DISABLED", {
    message: "Enable learning to use recordFalsePositive, recordFalseNegative, and other learning features",
    code: `const redactor = new OpenRedaction({
  enableLearning: true,
  learningStorePath: '.openredaction/learnings.json'
});`,
    docs: "https://github.com/sam247/openredaction#learning-system"
  });
}
function createOptimizationDisabledError() {
  return new OpenRedactionError("Priority optimization is disabled", "OPTIMIZATION_DISABLED", {
    message: "Enable priority optimization to use dynamic priority adjustment features",
    code: `const redactor = new OpenRedaction({
  enablePriorityOptimization: true,
  optimizerOptions: {
    learningWeight: 0.3,
    minSampleSize: 10,
    maxPriorityAdjustment: 15
  }
});`,
    docs: "https://github.com/sam247/openredaction#priority-optimization"
  });
}
var RegexTimeoutError = class extends Error {
  constructor(pattern, timeout) {
    super(`Regex execution exceeded timeout of ${timeout}ms: ${pattern}`);
    this.name = "RegexTimeoutError";
  }
};
function safeExec(regex, text, options = {}) {
  const timeout = options.timeout ?? 100;
  const startTime = performance.now();
  try {
    const result = regex.exec(text);
    if (performance.now() - startTime > timeout) throw new RegexTimeoutError(regex.source, timeout);
    return result;
  } catch (error) {
    if (error instanceof RegexTimeoutError) throw error;
    throw error;
  }
}
function isUnsafePattern(pattern) {
  if (/\*\+|\+\*|\+\+|\*\*/.test(pattern)) return true;
  if (/\(a\+\)\+|\(b\*\)\*|\(c\+\)\+/.test(pattern)) return true;
  return false;
}
function validatePattern(pattern) {
  const patternStr = typeof pattern === "string" ? pattern : pattern.source;
  if (patternStr.length > 5e3) throw new Error(`Regex pattern too long: ${patternStr.length} chars (max 5000)`);
  if (isUnsafePattern(patternStr)) throw new Error(`Potentially unsafe regex pattern detected: ${patternStr.substring(0, 100)}...`);
  try {
    new RegExp(patternStr);
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${error.message}`);
  }
}
var ConfigExporter_exports = /* @__PURE__ */ __exportAll({
  ConfigExporter: () => ConfigExporter,
  createConfigPreset: () => createConfigPreset,
  exportForVersionControl: () => exportForVersionControl
});
function createConfigPreset(name, description, options) {
  return ConfigExporter.exportToString(options, {
    description: `${name}: ${description}`,
    tags: [name, "preset"]
  }, true);
}
function exportForVersionControl(options) {
  return ConfigExporter.exportToString(options, {
    description: "OpenRedaction configuration",
    author: "Generated automatically",
    tags: ["version-control"]
  }, true);
}
var ConfigExporter;
var init_ConfigExporter = __esmMin(() => {
  ConfigExporter = class {
    static {
      this.CONFIG_VERSION = "1.0";
    }
    /**
    * Export configuration to JSON
    */
    static exportConfig(options, metadata) {
      const exported = {
        version: this.CONFIG_VERSION,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        options: {
          includeNames: options.includeNames,
          includeAddresses: options.includeAddresses,
          includePhones: options.includePhones,
          includeEmails: options.includeEmails,
          patterns: options.patterns,
          categories: options.categories,
          whitelist: options.whitelist,
          deterministic: options.deterministic,
          redactionMode: options.redactionMode,
          preset: options.preset,
          enableContextAnalysis: options.enableContextAnalysis,
          confidenceThreshold: options.confidenceThreshold,
          enableFalsePositiveFilter: options.enableFalsePositiveFilter,
          falsePositiveThreshold: options.falsePositiveThreshold,
          enableMultiPass: options.enableMultiPass,
          multiPassCount: options.multiPassCount,
          enableCache: options.enableCache,
          cacheSize: options.cacheSize,
          maxInputSize: options.maxInputSize,
          regexTimeout: options.regexTimeout
        },
        metadata
      };
      if (options.customPatterns && options.customPatterns.length > 0) exported.customPatterns = options.customPatterns.map((p) => ({
        type: p.type,
        regex: p.regex.source,
        flags: p.regex.flags,
        priority: p.priority,
        placeholder: p.placeholder,
        description: p.description,
        severity: p.severity
      }));
      return JSON.parse(JSON.stringify(exported));
    }
    /**
    * Import configuration from JSON
    */
    static importConfig(exported, _options) {
      if (!exported.version || exported.version !== this.CONFIG_VERSION) console.warn(`[OpenRedaction] Config version mismatch. Expected ${this.CONFIG_VERSION}, got ${exported.version}`);
      const config = { ...exported.options };
      if (exported.customPatterns) config.customPatterns = exported.customPatterns.map((p) => {
        return {
          type: p.type,
          regex: new RegExp(p.regex, p.flags),
          priority: p.priority,
          placeholder: p.placeholder,
          description: p.description,
          severity: p.severity
        };
      });
      return config;
    }
    /**
    * Export configuration to JSON string
    */
    static exportToString(options, metadata, pretty) {
      const exported = this.exportConfig(options, metadata);
      return JSON.stringify(exported, null, pretty ? 2 : void 0);
    }
    /**
    * Import configuration from JSON string
    */
    static importFromString(json) {
      const exported = JSON.parse(json);
      return this.importConfig(exported);
    }
    /**
    * Export configuration to file (Node.js only)
    */
    static async exportToFile(filePath, options, metadata) {
      const fs2 = await import("fs/promises");
      const content = this.exportToString(options, metadata, true);
      await fs2.writeFile(filePath, content, "utf-8");
    }
    /**
    * Import configuration from file (Node.js only)
    */
    static async importFromFile(filePath) {
      const content = await (await import("fs/promises")).readFile(filePath, "utf-8");
      return this.importFromString(content);
    }
    /**
    * Validate exported config structure
    */
    static validateConfig(exported) {
      const errors = [];
      if (!exported.version) errors.push("Missing version field");
      if (!exported.timestamp) errors.push("Missing timestamp field");
      if (!exported.options) errors.push("Missing options field");
      if (exported.customPatterns) for (const pattern of exported.customPatterns) {
        if (!pattern.type || !pattern.regex || !pattern.placeholder) errors.push(`Invalid custom pattern: ${pattern.type}`);
        try {
          new RegExp(pattern.regex, pattern.flags);
        } catch (e) {
          errors.push(`Invalid regex in pattern ${pattern.type}: ${e.message}`);
        }
      }
      return {
        valid: errors.length === 0,
        errors
      };
    }
    /**
    * Merge two configurations (useful for extending base configs)
    */
    static mergeConfigs(base, override) {
      return {
        version: this.CONFIG_VERSION,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        options: {
          ...base.options,
          ...override.options,
          patterns: override.options.patterns || base.options.patterns,
          categories: override.options.categories || base.options.categories,
          whitelist: [...base.options.whitelist || [], ...override.options.whitelist || []]
        },
        customPatterns: [...base.customPatterns || [], ...override.customPatterns || []],
        metadata: {
          ...base.metadata,
          ...override.metadata
        }
      };
    }
  };
});
var HealthCheck_exports = /* @__PURE__ */ __exportAll({
  HealthChecker: () => HealthChecker,
  createHealthChecker: () => createHealthChecker,
  healthCheckMiddleware: () => healthCheckMiddleware
});
function createHealthChecker(detector2) {
  return new HealthChecker(detector2);
}
function healthCheckMiddleware(detector2) {
  const checker = new HealthChecker(detector2);
  return async (_req, res) => {
    try {
      const result = await checker.check({
        testDetection: true,
        checkPerformance: true,
        performanceThreshold: 100,
        memoryThreshold: 100
      });
      const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error.message
      });
    }
  };
}
var HealthChecker;
var init_HealthCheck = __esmMin(() => {
  HealthChecker = class {
    constructor(detector2) {
      this.detector = detector2;
      this.initTime = Date.now();
    }
    /**
    * Run complete health check
    */
    async check(options = {}) {
      const result = {
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        checks: {
          detector: {
            status: "pass",
            message: "Detector initialized"
          },
          patterns: {
            status: "pass",
            message: "Patterns loaded"
          },
          performance: {
            status: "pass",
            message: "Performance acceptable"
          },
          memory: {
            status: "pass",
            message: "Memory usage normal"
          }
        },
        metrics: {
          totalPatterns: 0,
          compiledPatterns: 0,
          cacheEnabled: false,
          uptime: Date.now() - this.initTime
        },
        errors: [],
        warnings: []
      };
      try {
        result.checks.detector = await this.checkDetector(options);
        result.checks.patterns = await this.checkPatterns();
        if (options.checkPerformance !== false) result.checks.performance = await this.checkPerformance(options.performanceThreshold);
        result.checks.memory = await this.checkMemory(options.memoryThreshold);
        result.metrics = this.collectMetrics();
        result.status = this.determineOverallStatus(result.checks);
        for (const check of Object.values(result.checks)) if (check.status === "fail") result.errors.push(check.message);
        else if (check.status === "warn") result.warnings.push(check.message);
      } catch (error) {
        result.status = "unhealthy";
        result.errors.push(`Health check failed: ${error.message}`);
      }
      return result;
    }
    /**
    * Check detector functionality
    */
    async checkDetector(options) {
      try {
        if (options.testDetection !== false) {
          const result = await this.detector.detect("Test email: test@example.com");
          if (!result || !result.detections) return {
            status: "fail",
            message: "Detector returned invalid result"
          };
          if (result.detections.length === 0) return {
            status: "warn",
            message: "Test detection found no PII (expected at least 1)"
          };
        }
        return {
          status: "pass",
          message: "Detector functioning correctly"
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Detector check failed: ${error.message}`
        };
      }
    }
    /**
    * Check patterns are loaded
    */
    async checkPatterns() {
      try {
        const patterns = this.detector.getPatterns();
        if (!patterns || patterns.length === 0) return {
          status: "fail",
          message: "No patterns loaded",
          value: 0,
          threshold: 1
        };
        if (patterns.length < 10) return {
          status: "warn",
          message: "Very few patterns loaded (expected more)",
          value: patterns.length,
          threshold: 10
        };
        return {
          status: "pass",
          message: `${patterns.length} patterns loaded`,
          value: patterns.length
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Pattern check failed: ${error.message}`
        };
      }
    }
    /**
    * Check performance
    */
    async checkPerformance(threshold = 100) {
      try {
        const testText = "Test: john@example.com, phone: 555-123-4567, IP: 192.168.1.1";
        const start = performance.now();
        await this.detector.detect(testText);
        const duration = performance.now() - start;
        if (duration > threshold * 2) return {
          status: "fail",
          message: `Performance degraded: ${duration.toFixed(2)}ms`,
          value: duration,
          threshold
        };
        if (duration > threshold) return {
          status: "warn",
          message: `Performance slower than expected: ${duration.toFixed(2)}ms`,
          value: duration,
          threshold
        };
        return {
          status: "pass",
          message: `Performance good: ${duration.toFixed(2)}ms`,
          value: duration,
          threshold
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Performance check failed: ${error.message}`
        };
      }
    }
    /**
    * Check memory usage
    */
    async checkMemory(threshold = 100) {
      try {
        if (typeof process === "undefined" || !process.memoryUsage) return {
          status: "pass",
          message: "Memory check skipped (not in Node.js)"
        };
        const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
        if (heapUsedMB > threshold * 2) return {
          status: "fail",
          message: `High memory usage: ${heapUsedMB.toFixed(2)}MB`,
          value: heapUsedMB,
          threshold
        };
        if (heapUsedMB > threshold) return {
          status: "warn",
          message: `Elevated memory usage: ${heapUsedMB.toFixed(2)}MB`,
          value: heapUsedMB,
          threshold
        };
        return {
          status: "pass",
          message: `Memory usage normal: ${heapUsedMB.toFixed(2)}MB`,
          value: heapUsedMB,
          threshold
        };
      } catch (error) {
        return {
          status: "warn",
          message: `Memory check skipped: ${error.message}`
        };
      }
    }
    /**
    * Collect metrics
    */
    collectMetrics() {
      const patterns = this.detector.getPatterns();
      const cacheStats = this.detector.getCacheStats();
      return {
        totalPatterns: patterns.length,
        compiledPatterns: patterns.length,
        cacheSize: cacheStats.size,
        cacheEnabled: cacheStats.enabled,
        uptime: Date.now() - this.initTime
      };
    }
    /**
    * Determine overall status
    */
    determineOverallStatus(checks) {
      const statuses = Object.values(checks).map((c) => c.status);
      if (statuses.includes("fail")) return "unhealthy";
      if (statuses.includes("warn")) return "degraded";
      return "healthy";
    }
    /**
    * Quick health check (minimal overhead)
    */
    async quickCheck() {
      try {
        if (this.detector.getPatterns().length === 0) return {
          status: "unhealthy",
          message: "No patterns loaded"
        };
        return {
          status: "healthy",
          message: "OK"
        };
      } catch (error) {
        return {
          status: "unhealthy",
          message: `Error: ${error.message}`
        };
      }
    }
    /**
    * Get system info for debugging
    */
    getSystemInfo() {
      const patterns = this.detector.getPatterns();
      const cacheStats = this.detector.getCacheStats();
      return {
        version: "1.0.0",
        patterns: {
          total: patterns.length,
          types: [...new Set(patterns.map((p) => p.type.split("_")[0]))].length
        },
        cache: {
          enabled: cacheStats.enabled,
          size: cacheStats.size,
          maxSize: cacheStats.maxSize
        },
        uptime: Date.now() - this.initTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  };
});
function createOCRProcessor() {
  return new OCRProcessor();
}
var OCRProcessor;
var init_OCRProcessor = __esmMin(() => {
  OCRProcessor = class {
    constructor() {
      try {
        this.tesseract = __require2("tesseract.js");
      } catch {
      }
    }
    /**
    * Extract text from image buffer using OCR
    */
    async recognizeText(buffer, options) {
      if (!this.tesseract) throw new Error("[OCRProcessor] OCR support requires tesseract.js. Install with: npm install tesseract.js");
      const startTime = performance.now();
      try {
        const language = Array.isArray(options?.language) ? options.language.join("+") : options?.language || "eng";
        const worker = await this.tesseract.createWorker(language, options?.oem || 3);
        if (options?.psm !== void 0) await worker.setParameters({ tessedit_pageseg_mode: options.psm });
        const result = await worker.recognize(buffer);
        await worker.terminate();
        const endTime = performance.now();
        const processingTime = Math.round((endTime - startTime) * 100) / 100;
        return {
          text: result.data.text || "",
          confidence: result.data.confidence || 0,
          processingTime
        };
      } catch (error) {
        throw new Error(`[OCRProcessor] OCR recognition failed: ${error.message}`);
      }
    }
    /**
    * Check if OCR is available (tesseract.js installed)
    */
    isAvailable() {
      return !!this.tesseract;
    }
    /**
    * Create a scheduler for batch OCR processing
    * More efficient for processing multiple images
    */
    async createScheduler(workerCount = 4) {
      if (!this.tesseract) throw new Error("[OCRProcessor] OCR support requires tesseract.js. Install with: npm install tesseract.js");
      if (this.scheduler) await this.scheduler.terminate();
      this.scheduler = this.tesseract.createScheduler();
      const workers = [];
      for (let i = 0; i < workerCount; i++) {
        const worker = await this.tesseract.createWorker("eng");
        this.scheduler.addWorker(worker);
        workers.push(worker);
      }
      return this.scheduler;
    }
    /**
    * Batch process multiple images
    */
    async recognizeBatch(buffers, _options) {
      if (!this.tesseract) throw new Error("[OCRProcessor] OCR support requires tesseract.js. Install with: npm install tesseract.js");
      const scheduler = await this.createScheduler();
      try {
        const results = await Promise.all(buffers.map(async (buffer) => {
          const startTime = performance.now();
          const result = await scheduler.addJob("recognize", buffer);
          const endTime = performance.now();
          return {
            text: result.data.text || "",
            confidence: result.data.confidence || 0,
            processingTime: Math.round((endTime - startTime) * 100) / 100
          };
        }));
        await scheduler.terminate();
        this.scheduler = void 0;
        return results;
      } catch (error) {
        if (scheduler) {
          await scheduler.terminate();
          this.scheduler = void 0;
        }
        throw new Error(`[OCRProcessor] Batch OCR failed: ${error.message}`);
      }
    }
    /**
    * Terminate any running scheduler
    */
    async cleanup() {
      if (this.scheduler) {
        await this.scheduler.terminate();
        this.scheduler = void 0;
      }
    }
  };
});
function createJsonProcessor() {
  return new JsonProcessor();
}
var JsonProcessor;
var init_JsonProcessor = __esmMin(() => {
  JsonProcessor = class {
    constructor() {
      this.defaultOptions = {
        maxDepth: 100,
        scanKeys: false,
        alwaysRedact: [],
        skipPaths: [],
        piiIndicatorKeys: [
          "email",
          "e-mail",
          "mail",
          "phone",
          "tel",
          "telephone",
          "mobile",
          "ssn",
          "social_security",
          "address",
          "street",
          "city",
          "zip",
          "postal",
          "name",
          "firstname",
          "lastname",
          "fullname",
          "password",
          "pwd",
          "secret",
          "token",
          "key",
          "card",
          "credit_card",
          "creditcard",
          "account",
          "iban",
          "swift",
          "passport",
          "license",
          "licence"
        ],
        preserveStructure: true
      };
    }
    /**
    * Parse JSON from buffer or string
    */
    parse(input) {
      try {
        const text = typeof input === "string" ? input : input.toString("utf-8");
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`[JsonProcessor] Invalid JSON: ${error.message}`);
      }
    }
    /**
    * Detect PII in JSON data
    */
    async detect(data, detector2, options) {
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const pathsDetected = [];
      const matchesByPath = {};
      const allDetections = [];
      const promises = [];
      this.traverse(data, "", opts, (path2, value, key) => {
        promises.push((async () => {
          if (this.shouldSkip(path2, opts.skipPaths)) return;
          if (this.shouldAlwaysRedact(path2, opts.alwaysRedact)) {
            const detection = {
              type: "SENSITIVE_FIELD",
              value: String(value),
              placeholder: `[SENSITIVE_FIELD]`,
              position: [0, String(value).length],
              severity: "high",
              confidence: 1
            };
            matchesByPath[path2] = [detection];
            pathsDetected.push(path2);
            allDetections.push(detection);
            return;
          }
          if (opts.scanKeys && key) {
            const keyResult = await detector2.detect(key);
            if (keyResult.detections.length > 0) {
              const keyPath = `${path2}.__key__`;
              matchesByPath[keyPath] = keyResult.detections;
              pathsDetected.push(keyPath);
              allDetections.push(...keyResult.detections);
            }
          }
          const valueStr = String(value);
          const result = await detector2.detect(valueStr);
          if (result.detections.length > 0) {
            const boostedDetections = this.boostConfidenceFromKey(result.detections, key, opts.piiIndicatorKeys);
            matchesByPath[path2] = boostedDetections;
            pathsDetected.push(path2);
            allDetections.push(...boostedDetections);
          }
        })());
      });
      await Promise.all(promises);
      const original = JSON.stringify(data);
      const redacted = this.redact(data, {
        original,
        redacted: original,
        detections: allDetections,
        redactionMap: {},
        stats: { piiCount: allDetections.length },
        pathsDetected,
        matchesByPath
      }, opts);
      const redactionMap = {};
      allDetections.forEach((det) => {
        redactionMap[det.placeholder] = det.value;
      });
      return {
        original,
        redacted: typeof redacted === "string" ? redacted : JSON.stringify(redacted),
        detections: allDetections,
        redactionMap,
        stats: { piiCount: allDetections.length },
        pathsDetected,
        matchesByPath
      };
    }
    /**
    * Redact PII in JSON data
    */
    redact(data, detectionResult, options) {
      if (!{
        ...this.defaultOptions,
        ...options
      }.preserveStructure) return this.parse(this.redactText(JSON.stringify(data, null, 2), detectionResult));
      return this.redactPreservingStructure(data, detectionResult.pathsDetected);
    }
    /**
    * Redact specific paths in JSON while preserving structure
    */
    redactPreservingStructure(data, pathsToRedact) {
      const pathSet = new Set(pathsToRedact);
      const redactValue = (value, currentPath) => {
        if (pathSet.has(currentPath)) {
          if (typeof value === "string") return "[REDACTED]";
          else if (typeof value === "number") return 0;
          else if (typeof value === "boolean") return false;
          else if (value === null) return null;
          else if (Array.isArray(value)) return [];
          else if (typeof value === "object") return {};
          return "[REDACTED]";
        }
        if (Array.isArray(value)) return value.map((item, index) => redactValue(item, `${currentPath}[${index}]`));
        if (value !== null && typeof value === "object") {
          const result = {};
          for (const [key, val] of Object.entries(value)) result[key] = redactValue(val, currentPath ? `${currentPath}.${key}` : key);
          return result;
        }
        return value;
      };
      return redactValue(data, "");
    }
    /**
    * Simple text-based redaction (fallback)
    */
    redactText(text, detectionResult) {
      let redacted = text;
      const sortedDetections = [...detectionResult.detections].sort((a, b) => b.position[0] - a.position[0]);
      for (const detection of sortedDetections) {
        const [start, end] = detection.position;
        redacted = redacted.slice(0, start) + detection.placeholder + redacted.slice(end);
      }
      return redacted;
    }
    /**
    * Traverse JSON structure and call callback for each value
    */
    traverse(obj, path2, options, callback, depth = 0) {
      if (depth > options.maxDepth) throw new Error(`[JsonProcessor] Maximum depth (${options.maxDepth}) exceeded`);
      if (obj === null || obj === void 0) return;
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemPath = path2 ? `${path2}[${index}]` : `[${index}]`;
          if (this.isPrimitive(item)) callback(itemPath, item);
          this.traverse(item, itemPath, options, callback, depth + 1);
        });
        return;
      }
      if (typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          const valuePath = path2 ? `${path2}.${key}` : key;
          if (this.isPrimitive(value)) callback(valuePath, value, key);
          this.traverse(value, valuePath, options, callback, depth + 1);
        }
        return;
      }
      if (this.isPrimitive(obj)) callback(path2, obj);
    }
    /**
    * Check if value is primitive (string, number, boolean)
    */
    isPrimitive(value) {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }
    /**
    * Check if path should be skipped
    */
    shouldSkip(path2, skipPaths) {
      return skipPaths.some((skipPath) => {
        if (path2 === skipPath) return true;
        return new RegExp("^" + skipPath.replace(/\*/g, "[^.]+") + "$").test(path2);
      });
    }
    /**
    * Check if path should always be redacted
    */
    shouldAlwaysRedact(path2, alwaysRedact) {
      return alwaysRedact.some((redactPath) => {
        if (path2 === redactPath) return true;
        return new RegExp("^" + redactPath.replace(/\*/g, "[^.]+") + "$").test(path2);
      });
    }
    /**
    * Boost confidence if key name indicates PII
    */
    boostConfidenceFromKey(detections, key, piiIndicatorKeys) {
      if (!key) return detections;
      const keyLower = key.toLowerCase();
      if (!piiIndicatorKeys.some((indicator) => keyLower.includes(indicator.toLowerCase()))) return detections;
      return detections.map((detection) => ({
        ...detection,
        confidence: Math.min(1, (detection.confidence || 0.5) * 1.2)
      }));
    }
    /**
    * Extract all text values from JSON for simple text-based detection
    */
    extractText(data, options) {
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const textParts = [];
      this.traverse(data, "", opts, (_path, value, key) => {
        if (opts.scanKeys && key) textParts.push(key);
        if (typeof value === "string") textParts.push(value);
      });
      return textParts.join(" ");
    }
    /**
    * Validate JSON buffer/string
    */
    isValid(input) {
      try {
        this.parse(input);
        return true;
      } catch {
        return false;
      }
    }
    /**
    * Get JSON Lines (JSONL) support - split by newlines and parse each line
    */
    parseJsonLines(input) {
      return (typeof input === "string" ? input : input.toString("utf-8")).split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`[JsonProcessor] Invalid JSON at line ${index + 1}: ${error.message}`);
        }
      });
    }
    /**
    * Detect PII in JSON Lines format
    */
    async detectJsonLines(input, detector2, options) {
      const documents = this.parseJsonLines(input);
      return Promise.all(documents.map((doc) => this.detect(doc, detector2, options)));
    }
  };
});
function createCsvProcessor() {
  return new CsvProcessor();
}
var CsvProcessor;
var init_CsvProcessor = __esmMin(() => {
  CsvProcessor = class {
    constructor() {
      this.defaultOptions = {
        quote: '"',
        escape: '"',
        skipEmptyLines: true,
        piiIndicatorNames: [
          "email",
          "e-mail",
          "mail",
          "email_address",
          "phone",
          "tel",
          "telephone",
          "mobile",
          "phone_number",
          "ssn",
          "social_security",
          "social_security_number",
          "address",
          "street",
          "street_address",
          "city",
          "zip",
          "zipcode",
          "postal",
          "postcode",
          "name",
          "firstname",
          "first_name",
          "lastname",
          "last_name",
          "fullname",
          "full_name",
          "password",
          "pwd",
          "secret",
          "token",
          "api_key",
          "card",
          "credit_card",
          "creditcard",
          "card_number",
          "account",
          "account_number",
          "iban",
          "swift",
          "passport",
          "passport_number",
          "license",
          "licence",
          "driver_license",
          "dob",
          "date_of_birth",
          "birth_date",
          "birthdate"
        ],
        treatFirstRowAsHeader: true
      };
    }
    /**
    * Parse CSV from buffer or string
    */
    parse(input, options) {
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const text = typeof input === "string" ? input : input.toString("utf-8");
      const delimiter = opts.delimiter || this.detectDelimiter(text);
      const lines = text.split(/\r?\n/);
      const rows = [];
      let rowIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (opts.skipEmptyLines && line.trim().length === 0) continue;
        if (opts.maxRows !== void 0 && rowIndex >= opts.maxRows) break;
        const values = this.parseRow(line, delimiter, opts.quote, opts.escape);
        rows.push({
          index: rowIndex,
          values
        });
        rowIndex++;
      }
      return rows;
    }
    /**
    * Detect PII in CSV data
    */
    async detect(input, detector2, options) {
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const rows = this.parse(input, options);
      if (rows.length === 0) {
        const original2 = typeof input === "string" ? input : input.toString("utf-8");
        return {
          original: original2,
          redacted: original2,
          detections: [],
          redactionMap: {},
          stats: { piiCount: 0 },
          rowCount: 0,
          columnCount: 0,
          columnStats: {},
          matchesByCell: []
        };
      }
      const hasHeader = opts.hasHeader !== void 0 ? opts.hasHeader : this.detectHeader(rows);
      const headers = hasHeader && rows.length > 0 ? rows[0].values : void 0;
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const columnCount = rows[0].values.length;
      const columnNameToIndex = /* @__PURE__ */ new Map();
      if (headers) headers.forEach((header, index) => {
        columnNameToIndex.set(header.toLowerCase().trim(), index);
      });
      const alwaysRedactCols = new Set(opts.alwaysRedactColumns || []);
      if (opts.alwaysRedactColumnNames && headers) opts.alwaysRedactColumnNames.forEach((name) => {
        const index = columnNameToIndex.get(name.toLowerCase().trim());
        if (index !== void 0) alwaysRedactCols.add(index);
      });
      const skipCols = new Set(opts.skipColumns || []);
      const columnStats = {};
      const matchesByCell = [];
      const allDetections = [];
      for (let col = 0; col < columnCount; col++) columnStats[col] = {
        columnIndex: col,
        columnName: headers?.[col],
        piiCount: 0,
        piiPercentage: 0,
        piiTypes: []
      };
      for (const row of dataRows) for (let col = 0; col < row.values.length; col++) {
        if (skipCols.has(col)) continue;
        const cellValue = row.values[col];
        if (alwaysRedactCols.has(col)) {
          const detection = {
            type: "SENSITIVE_COLUMN",
            value: cellValue,
            placeholder: `[SENSITIVE_COLUMN_${col}]`,
            position: [0, cellValue.length],
            severity: "high",
            confidence: 1
          };
          matchesByCell.push({
            row: row.index,
            column: col,
            columnName: headers?.[col],
            value: cellValue,
            matches: [detection]
          });
          allDetections.push(detection);
          columnStats[col].piiCount++;
          continue;
        }
        const result = await detector2.detect(cellValue);
        if (result.detections.length > 0) {
          const boostedDetections = this.boostConfidenceFromColumnName(result.detections, headers?.[col], opts.piiIndicatorNames || []);
          matchesByCell.push({
            row: row.index,
            column: col,
            columnName: headers?.[col],
            value: cellValue,
            matches: boostedDetections
          });
          allDetections.push(...boostedDetections);
          columnStats[col].piiCount += boostedDetections.length;
          const columnTypes = new Set(columnStats[col].piiTypes);
          boostedDetections.forEach((d) => columnTypes.add(d.type));
          columnStats[col].piiTypes = Array.from(columnTypes);
        }
      }
      for (let col = 0; col < columnCount; col++) {
        const rowsWithPii = matchesByCell.filter((m) => m.column === col).length;
        columnStats[col].piiPercentage = dataRows.length > 0 ? rowsWithPii / dataRows.length * 100 : 0;
      }
      const original = typeof input === "string" ? input : input.toString("utf-8");
      const redacted = this.redact(original, {
        original,
        redacted: original,
        detections: allDetections,
        redactionMap: {},
        stats: { piiCount: allDetections.length },
        rowCount: dataRows.length,
        columnCount,
        headers,
        columnStats,
        matchesByCell
      }, opts);
      const redactionMap = {};
      allDetections.forEach((det) => {
        redactionMap[det.placeholder] = det.value;
      });
      return {
        original,
        redacted,
        detections: allDetections,
        redactionMap,
        stats: { piiCount: allDetections.length },
        rowCount: dataRows.length,
        columnCount,
        headers: headers?.filter((h) => h !== void 0),
        columnStats,
        matchesByCell
      };
    }
    /**
    * Redact PII in CSV data
    */
    redact(input, detectionResult, options) {
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const rows = this.parse(input, options);
      if (rows.length === 0) return "";
      const delimiter = opts.delimiter || this.detectDelimiter(typeof input === "string" ? input : input.toString("utf-8"));
      const hasHeader = detectionResult.headers !== void 0;
      const redactionMap = /* @__PURE__ */ new Map();
      for (const cellMatch of detectionResult.matchesByCell) {
        if (!redactionMap.has(cellMatch.row)) redactionMap.set(cellMatch.row, /* @__PURE__ */ new Map());
        redactionMap.get(cellMatch.row).set(cellMatch.column, "[REDACTED]");
      }
      const outputRows = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (hasHeader && i === 0) outputRows.push(this.formatRow(row.values, delimiter, opts.quote));
        else {
          const rowIndex = hasHeader ? i - 1 : i;
          const redactedValues = row.values.map((value, colIndex) => {
            return redactionMap.get(rowIndex)?.get(colIndex) || value;
          });
          outputRows.push(this.formatRow(redactedValues, delimiter, opts.quote));
        }
      }
      return outputRows.join("\n");
    }
    /**
    * Parse a single CSV row
    */
    parseRow(line, delimiter, quote, _escape) {
      const values = [];
      let current = "";
      let inQuotes = false;
      let i = 0;
      while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        if (char === quote) if (inQuotes && nextChar === quote) {
          current += quote;
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
        else if (char === delimiter && !inQuotes) {
          values.push(current);
          current = "";
          i++;
        } else {
          current += char;
          i++;
        }
      }
      values.push(current);
      return values;
    }
    /**
    * Format a row as CSV
    */
    formatRow(values, delimiter, quote) {
      return values.map((value) => {
        if (value.includes(delimiter) || value.includes(quote) || value.includes("\n")) return `${quote}${value.replace(new RegExp(quote, "g"), quote + quote)}${quote}`;
        return value;
      }).join(delimiter);
    }
    /**
    * Auto-detect CSV delimiter
    */
    detectDelimiter(text) {
      const delimiters = [
        ",",
        "	",
        ";",
        "|"
      ];
      const lines = text.split(/\r?\n/).slice(0, 5);
      let bestDelimiter = ",";
      let bestScore = 0;
      for (const delimiter of delimiters) {
        const counts = lines.map((line) => {
          let count = 0;
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            if (char === delimiter && !inQuotes) count++;
          }
          return count;
        });
        if (counts.length > 0 && counts[0] > 0) {
          const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
          const score = avg / (counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length + 1);
          if (score > bestScore) {
            bestScore = score;
            bestDelimiter = delimiter;
          }
        }
      }
      return bestDelimiter;
    }
    /**
    * Detect if first row is likely a header
    */
    detectHeader(rows) {
      if (rows.length < 2) return false;
      const firstRow = rows[0].values;
      const secondRow = rows[1].values;
      if (firstRow.reduce((sum, v) => sum + v.length, 0) / firstRow.length > secondRow.reduce((sum, v) => sum + v.length, 0) / secondRow.length * 1.5) return false;
      const firstRowNumeric = firstRow.filter((v) => !isNaN(Number(v)) && v.trim() !== "").length;
      return firstRow.length - firstRowNumeric >= firstRowNumeric;
    }
    /**
    * Boost confidence if column name indicates PII
    */
    boostConfidenceFromColumnName(detections, columnName, piiIndicatorNames) {
      if (!columnName) return detections;
      const nameLower = columnName.toLowerCase().trim();
      if (!piiIndicatorNames.some((indicator) => nameLower.includes(indicator.toLowerCase()))) return detections;
      return detections.map((detection) => ({
        ...detection,
        confidence: Math.min(1, (detection.confidence || 0.5) * 1.2)
      }));
    }
    /**
    * Extract all cell values as text
    */
    extractText(input, options) {
      const rows = this.parse(input, options);
      const textParts = [];
      for (const row of rows) for (const value of row.values) if (value.trim().length > 0) textParts.push(value);
      return textParts.join(" ");
    }
    /**
    * Get column statistics without full PII detection
    */
    getColumnInfo(input, options) {
      const rows = this.parse(input, options);
      if (rows.length === 0) return {
        columnCount: 0,
        rowCount: 0,
        sampleRows: []
      };
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const hasHeader = opts.hasHeader !== void 0 ? opts.hasHeader : this.detectHeader(rows);
      const headers = hasHeader && rows.length > 0 ? rows[0].values : void 0;
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const sampleRows = dataRows.slice(0, 5).map((r) => r.values);
      return {
        columnCount: rows[0].values.length,
        rowCount: dataRows.length,
        headers,
        sampleRows
      };
    }
  };
});
function createXlsxProcessor() {
  return new XlsxProcessor();
}
var XlsxProcessor;
var init_XlsxProcessor = __esmMin(() => {
  XlsxProcessor = class {
    constructor() {
      this.defaultOptions = {
        piiIndicatorNames: [
          "email",
          "e-mail",
          "mail",
          "email_address",
          "phone",
          "tel",
          "telephone",
          "mobile",
          "phone_number",
          "ssn",
          "social_security",
          "social_security_number",
          "address",
          "street",
          "street_address",
          "city",
          "zip",
          "zipcode",
          "postal",
          "postcode",
          "name",
          "firstname",
          "first_name",
          "lastname",
          "last_name",
          "fullname",
          "full_name",
          "password",
          "pwd",
          "secret",
          "token",
          "api_key",
          "card",
          "credit_card",
          "creditcard",
          "card_number",
          "account",
          "account_number",
          "iban",
          "swift",
          "passport",
          "passport_number",
          "license",
          "licence",
          "driver_license",
          "dob",
          "date_of_birth",
          "birth_date",
          "birthdate"
        ],
        preserveFormatting: true,
        preserveFormulas: true
      };
      try {
        this.xlsx = __require2("xlsx");
      } catch {
      }
    }
    /**
    * Check if XLSX support is available
    */
    isAvailable() {
      return !!this.xlsx;
    }
    /**
    * Parse XLSX from buffer
    */
    parse(buffer) {
      if (!this.xlsx) throw new Error("[XlsxProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      try {
        return this.xlsx.read(buffer, {
          type: "buffer",
          cellFormula: true,
          cellStyles: true
        });
      } catch (error) {
        throw new Error(`[XlsxProcessor] Failed to parse XLSX: ${error.message}`);
      }
    }
    /**
    * Detect PII in XLSX data
    */
    async detect(buffer, detector2, options) {
      if (!this.xlsx) throw new Error("[XlsxProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const workbook = this.parse(buffer);
      const sheetNames = this.getSheetNamesToProcess(workbook, opts);
      const sheetResults = [];
      const allDetections = [];
      const allTypes = /* @__PURE__ */ new Set();
      for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
        const sheetName = sheetNames[sheetIndex];
        const sheet = workbook.Sheets[sheetName];
        const sheetResult = await this.detectSheet(sheet, sheetName, sheetIndex, detector2, opts);
        sheetResults.push(sheetResult);
        allDetections.push(...sheetResult.matchesByCell.flatMap((c) => c.matches));
        sheetResult.matchesByCell.forEach((cell) => {
          cell.matches.forEach((det) => allTypes.add(det.type));
        });
      }
      const original = this.extractText(buffer, options);
      const redactedBuffer = this.redact(buffer, {
        original,
        redacted: original,
        detections: allDetections,
        redactionMap: {},
        stats: { piiCount: allDetections.length },
        sheetResults,
        sheetCount: sheetResults.length
      }, options);
      const redacted = this.extractText(redactedBuffer, options);
      const redactionMap = {};
      allDetections.forEach((det) => {
        redactionMap[det.placeholder] = det.value;
      });
      return {
        original,
        redacted,
        detections: allDetections,
        redactionMap,
        stats: { piiCount: allDetections.length },
        sheetResults,
        sheetCount: sheetResults.length
      };
    }
    /**
    * Detect PII in a single sheet
    */
    async detectSheet(sheet, sheetName, sheetIndex, detector2, options) {
      const range = this.xlsx.utils.decode_range(sheet["!ref"] || "A1");
      const startRow = range.s.r;
      const endRow = options.maxRows !== void 0 ? Math.min(range.e.r, startRow + options.maxRows - 1) : range.e.r;
      const startCol = range.s.c;
      const endCol = range.e.c;
      const columnCount = endCol - startCol + 1;
      const hasHeader = options.hasHeader !== void 0 ? options.hasHeader : this.detectHeader(sheet, range);
      const headers = hasHeader ? this.getRowValues(sheet, startRow, startCol, endCol) : void 0;
      const dataStartRow = hasHeader ? startRow + 1 : startRow;
      const columnNameToIndex = /* @__PURE__ */ new Map();
      if (headers) headers.forEach((header, index) => {
        if (header) columnNameToIndex.set(header.toLowerCase().trim(), index);
      });
      const alwaysRedactCols = new Set(options.alwaysRedactColumns || []);
      if (options.alwaysRedactColumnNames && headers) options.alwaysRedactColumnNames.forEach((name) => {
        const index = columnNameToIndex.get(name.toLowerCase().trim());
        if (index !== void 0) alwaysRedactCols.add(index);
      });
      const skipCols = new Set(options.skipColumns || []);
      const columnStats = {};
      for (let col = 0; col <= endCol - startCol; col++) columnStats[col] = {
        columnIndex: col,
        columnLetter: this.columnToLetter(col),
        columnName: headers?.[col],
        piiCount: 0,
        piiPercentage: 0,
        piiTypes: []
      };
      const matchesByCell = [];
      for (let row = dataStartRow; row <= endRow; row++) for (let col = startCol; col <= endCol; col++) {
        const colIndex = col - startCol;
        if (skipCols.has(colIndex)) continue;
        const cellRef = this.xlsx.utils.encode_cell({
          r: row,
          c: col
        });
        const cell = sheet[cellRef];
        if (!cell) continue;
        const cellValue = this.getCellValue(cell);
        if (!cellValue) continue;
        const cellFormula = cell.f;
        if (alwaysRedactCols.has(colIndex)) {
          const detection = {
            type: "SENSITIVE_COLUMN",
            value: cellValue,
            placeholder: `[SENSITIVE_COLUMN_${colIndex}]`,
            position: [0, cellValue.length],
            severity: "high",
            confidence: 1
          };
          matchesByCell.push({
            cell: cellRef,
            row: row + 1,
            column: colIndex,
            columnLetter: this.columnToLetter(colIndex),
            columnName: headers?.[colIndex],
            value: cellValue,
            formula: cellFormula,
            matches: [detection]
          });
          columnStats[colIndex].piiCount++;
          continue;
        }
        const result = await detector2.detect(cellValue);
        if (result.detections.length > 0) {
          const boostedDetections = this.boostConfidenceFromColumnName(result.detections, headers?.[colIndex], options.piiIndicatorNames || []);
          matchesByCell.push({
            cell: cellRef,
            row: row + 1,
            column: colIndex,
            columnLetter: this.columnToLetter(colIndex),
            columnName: headers?.[colIndex],
            value: cellValue,
            formula: cellFormula,
            matches: boostedDetections
          });
          columnStats[colIndex].piiCount += boostedDetections.length;
          const columnTypes = new Set(columnStats[colIndex].piiTypes);
          boostedDetections.forEach((d) => columnTypes.add(d.type));
          columnStats[colIndex].piiTypes = Array.from(columnTypes);
        }
      }
      const dataRowCount = endRow - dataStartRow + 1;
      for (let col = 0; col <= endCol - startCol; col++) {
        const rowsWithPii = matchesByCell.filter((m) => m.column === col).length;
        columnStats[col].piiPercentage = dataRowCount > 0 ? rowsWithPii / dataRowCount * 100 : 0;
      }
      return {
        sheetName,
        sheetIndex,
        rowCount: dataRowCount,
        columnCount,
        headers: headers?.filter((h) => h !== void 0),
        columnStats,
        matchesByCell
      };
    }
    /**
    * Redact PII in XLSX data
    */
    redact(buffer, detectionResult, options) {
      if (!this.xlsx) throw new Error("[XlsxProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const workbook = this.parse(buffer);
      for (const sheetResult of detectionResult.sheetResults) {
        const sheet = workbook.Sheets[sheetResult.sheetName];
        for (const cellMatch of sheetResult.matchesByCell) {
          const cell = sheet[cellMatch.cell];
          if (!cell) continue;
          cell.v = "[REDACTED]";
          cell.w = "[REDACTED]";
          if (!opts.preserveFormulas) delete cell.f;
          cell.t = "s";
        }
      }
      return this.xlsx.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
      });
    }
    /**
    * Get cell value as string
    */
    getCellValue(cell) {
      if (!cell) return "";
      if (cell.w !== void 0) return String(cell.w);
      if (cell.v !== void 0) return String(cell.v);
      return "";
    }
    /**
    * Get row values
    */
    getRowValues(sheet, row, startCol, endCol) {
      const values = [];
      for (let col = startCol; col <= endCol; col++) {
        const cell = sheet[this.xlsx.utils.encode_cell({
          r: row,
          c: col
        })];
        values.push(cell ? this.getCellValue(cell) : void 0);
      }
      return values;
    }
    /**
    * Detect if first row is likely a header
    */
    detectHeader(sheet, range) {
      const firstRow = this.getRowValues(sheet, range.s.r, range.s.c, range.e.c);
      const secondRow = range.s.r + 1 <= range.e.r ? this.getRowValues(sheet, range.s.r + 1, range.s.c, range.e.c) : null;
      if (!secondRow) return false;
      const firstRowValues = firstRow.filter((v) => v !== void 0);
      const secondRowValues = secondRow.filter((v) => v !== void 0);
      if (firstRowValues.length === 0 || secondRowValues.length === 0) return false;
      if (firstRowValues.reduce((sum, v) => sum + v.length, 0) / firstRowValues.length > secondRowValues.reduce((sum, v) => sum + v.length, 0) / secondRowValues.length * 1.5) return false;
      const firstRowNumeric = firstRowValues.filter((v) => !isNaN(Number(v)) && v.trim() !== "").length;
      return firstRowValues.length - firstRowNumeric >= firstRowNumeric;
    }
    /**
    * Convert column index to letter (0 = A, 25 = Z, 26 = AA)
    */
    columnToLetter(col) {
      let letter = "";
      while (col >= 0) {
        letter = String.fromCharCode(col % 26 + 65) + letter;
        col = Math.floor(col / 26) - 1;
      }
      return letter;
    }
    /**
    * Get sheet names to process based on options
    */
    getSheetNamesToProcess(workbook, options) {
      const allSheetNames = workbook.SheetNames;
      if (options.sheets && options.sheets.length > 0) return options.sheets.filter((name) => allSheetNames.includes(name));
      if (options.sheetIndices && options.sheetIndices.length > 0) return options.sheetIndices.filter((index) => index >= 0 && index < allSheetNames.length).map((index) => allSheetNames[index]);
      return allSheetNames;
    }
    /**
    * Boost confidence if column name indicates PII
    */
    boostConfidenceFromColumnName(detections, columnName, piiIndicatorNames) {
      if (!columnName) return detections;
      const nameLower = columnName.toLowerCase().trim();
      if (!piiIndicatorNames.some((indicator) => nameLower.includes(indicator.toLowerCase()))) return detections;
      return detections.map((detection) => ({
        ...detection,
        confidence: Math.min(1, (detection.confidence || 0.5) * 1.2)
      }));
    }
    /**
    * Extract all cell values as text
    */
    extractText(buffer, options) {
      if (!this.xlsx) throw new Error("[XlsxProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      const workbook = this.parse(buffer);
      const opts = {
        ...this.defaultOptions,
        ...options
      };
      const sheetNames = this.getSheetNamesToProcess(workbook, opts);
      const textParts = [];
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const range = this.xlsx.utils.decode_range(sheet["!ref"] || "A1");
        for (let row = range.s.r; row <= range.e.r; row++) for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = sheet[this.xlsx.utils.encode_cell({
            r: row,
            c: col
          })];
          if (cell) {
            const value = this.getCellValue(cell);
            if (value.trim().length > 0) textParts.push(value);
          }
        }
      }
      return textParts.join(" ");
    }
    /**
    * Get workbook metadata
    */
    getMetadata(buffer) {
      if (!this.xlsx) throw new Error("[XlsxProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      const workbook = this.parse(buffer);
      return {
        sheetNames: workbook.SheetNames,
        sheetCount: workbook.SheetNames.length
      };
    }
  };
});
function createDocumentProcessor() {
  return new DocumentProcessor();
}
var DocumentProcessor;
var init_DocumentProcessor = __esmMin(() => {
  init_OCRProcessor();
  init_JsonProcessor();
  init_CsvProcessor();
  init_XlsxProcessor();
  DocumentProcessor = class {
    constructor() {
      try {
        this.pdfParse = __require2("pdf-parse");
      } catch {
      }
      try {
        this.mammoth = __require2("mammoth");
      } catch {
      }
      this.ocrProcessor = new OCRProcessor();
      this.jsonProcessor = new JsonProcessor();
      this.csvProcessor = new CsvProcessor();
      this.xlsxProcessor = new XlsxProcessor();
    }
    /**
    * Extract text from document buffer
    */
    async extractText(buffer, options) {
      const format = options?.format || this.detectFormat(buffer);
      if (!format) throw new Error("[DocumentProcessor] Unable to detect document format. Supported: PDF, DOCX, TXT, images (with OCR)");
      const maxSize = options?.maxSize || 50 * 1024 * 1024;
      if (buffer.length > maxSize) throw new Error(`[DocumentProcessor] Document size (${buffer.length} bytes) exceeds maximum (${maxSize} bytes)`);
      switch (format) {
        case "pdf":
          return this.extractPdfText(buffer, options);
        case "docx":
          return this.extractDocxText(buffer, options);
        case "txt":
          return buffer.toString("utf-8");
        case "image":
          return this.extractImageText(buffer, options);
        case "json":
          return this.extractJsonText(buffer, options);
        case "csv":
          return this.extractCsvText(buffer, options);
        case "xlsx":
          return this.extractXlsxText(buffer, options);
        default:
          throw new Error(`[DocumentProcessor] Unsupported format: ${format}`);
      }
    }
    /**
    * Get document metadata
    */
    async getMetadata(buffer, options) {
      const format = options?.format || this.detectFormat(buffer);
      if (!format) throw new Error("[DocumentProcessor] Unable to detect document format");
      switch (format) {
        case "pdf":
          return this.getPdfMetadata(buffer, options);
        case "docx":
          return this.getDocxMetadata(buffer, options);
        case "txt":
          return {
            format: "txt",
            pages: void 0
          };
        case "image":
          return this.getImageMetadata(buffer, options);
        case "json":
          return this.getJsonMetadata(buffer, options);
        case "csv":
          return this.getCsvMetadata(buffer, options);
        case "xlsx":
          return this.getXlsxMetadata(buffer, options);
        default:
          throw new Error(`[DocumentProcessor] Unsupported format: ${format}`);
      }
    }
    /**
    * Detect document format from buffer
    */
    detectFormat(buffer) {
      if (buffer.length < 4) return null;
      if (buffer.toString("utf-8", 0, 4) === "%PDF") return "pdf";
      if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) return "image";
      if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image";
      if (buffer[0] === 73 && buffer[1] === 73 && buffer[2] === 42 && buffer[3] === 0 || buffer[0] === 77 && buffer[1] === 77 && buffer[2] === 0 && buffer[3] === 42) return "image";
      if (buffer[0] === 66 && buffer[1] === 77) return "image";
      if (buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80) return "image";
      if (buffer[0] === 80 && buffer[1] === 75) {
        const zipHeader = buffer.toString("utf-8", 0, Math.min(500, buffer.length));
        if (zipHeader.includes("word/") || zipHeader.includes("[Content_Types].xml")) return "docx";
        if (zipHeader.includes("xl/")) return "xlsx";
      }
      const text = buffer.toString("utf-8");
      const trimmed = text.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
        if (this.jsonProcessor.isValid(buffer)) return "json";
      }
      const lines = text.split(/\r?\n/).slice(0, 5);
      if (lines.length >= 2) for (const delimiter of [
        ",",
        "	",
        ";",
        "|"
      ]) {
        const counts = lines.map((line) => (line.match(new RegExp(delimiter, "g")) || []).length);
        if (counts[0] > 0 && counts.every((c) => c === counts[0])) return "csv";
      }
      const sample = buffer.slice(0, Math.min(1e3, buffer.length));
      if (sample.filter((byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13).length < sample.length * 0.1) return "txt";
      return null;
    }
    /**
    * Check if format is supported
    */
    isFormatSupported(format) {
      switch (format) {
        case "pdf":
          return !!this.pdfParse;
        case "docx":
          return !!this.mammoth;
        case "txt":
          return true;
        case "image":
          return this.ocrProcessor.isAvailable();
        case "json":
          return true;
        case "csv":
          return true;
        case "xlsx":
          return this.xlsxProcessor.isAvailable();
        default:
          return false;
      }
    }
    /**
    * Extract text from PDF
    */
    async extractPdfText(buffer, options) {
      if (!this.pdfParse) throw new Error("[DocumentProcessor] PDF support requires pdf-parse. Install with: npm install pdf-parse");
      try {
        const data = await this.pdfParse(buffer, {
          password: options?.password,
          max: options?.pages ? Math.max(...options.pages) : void 0
        });
        if (options?.pages) return data.text;
        return data.text || "";
      } catch (error) {
        throw new Error(`[DocumentProcessor] PDF extraction failed: ${error.message}`);
      }
    }
    /**
    * Extract text from DOCX
    */
    async extractDocxText(buffer, _options) {
      if (!this.mammoth) throw new Error("[DocumentProcessor] DOCX support requires mammoth. Install with: npm install mammoth");
      try {
        return (await this.mammoth.extractRawText({ buffer })).value || "";
      } catch (error) {
        throw new Error(`[DocumentProcessor] DOCX extraction failed: ${error.message}`);
      }
    }
    /**
    * Get PDF metadata
    */
    async getPdfMetadata(buffer, _options) {
      if (!this.pdfParse) throw new Error("[DocumentProcessor] PDF support requires pdf-parse. Install with: npm install pdf-parse");
      try {
        const data = await this.pdfParse(buffer, { password: _options?.password });
        return {
          format: "pdf",
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : void 0,
          modifiedDate: data.info?.ModDate ? new Date(data.info.ModDate) : void 0,
          custom: data.info
        };
      } catch (error) {
        throw new Error(`[DocumentProcessor] PDF metadata extraction failed: ${error.message}`);
      }
    }
    /**
    * Get DOCX metadata
    */
    async getDocxMetadata(_buffer, _options) {
      return {
        format: "docx",
        pages: void 0
      };
    }
    /**
    * Extract text from image using OCR
    */
    async extractImageText(buffer, options) {
      if (!this.ocrProcessor.isAvailable()) throw new Error("[DocumentProcessor] Image/OCR support requires tesseract.js. Install with: npm install tesseract.js");
      try {
        return (await this.ocrProcessor.recognizeText(buffer, options?.ocrOptions)).text;
      } catch (error) {
        throw new Error(`[DocumentProcessor] Image text extraction failed: ${error.message}`);
      }
    }
    /**
    * Get image metadata
    */
    async getImageMetadata(buffer, options) {
      if (!this.ocrProcessor.isAvailable()) return {
        format: "image",
        pages: void 0,
        usedOCR: false
      };
      try {
        return {
          format: "image",
          pages: void 0,
          usedOCR: true,
          ocrConfidence: (await this.ocrProcessor.recognizeText(buffer, options?.ocrOptions)).confidence
        };
      } catch {
        return {
          format: "image",
          pages: void 0,
          usedOCR: false
        };
      }
    }
    /**
    * Extract text from JSON
    */
    async extractJsonText(buffer, _options) {
      try {
        return this.jsonProcessor.extractText(buffer);
      } catch (error) {
        throw new Error(`[DocumentProcessor] JSON extraction failed: ${error.message}`);
      }
    }
    /**
    * Extract text from CSV
    */
    async extractCsvText(buffer, _options) {
      try {
        return this.csvProcessor.extractText(buffer);
      } catch (error) {
        throw new Error(`[DocumentProcessor] CSV extraction failed: ${error.message}`);
      }
    }
    /**
    * Extract text from XLSX
    */
    async extractXlsxText(buffer, _options) {
      if (!this.xlsxProcessor.isAvailable()) throw new Error("[DocumentProcessor] XLSX support requires xlsx package. Install with: npm install xlsx");
      try {
        return this.xlsxProcessor.extractText(buffer);
      } catch (error) {
        throw new Error(`[DocumentProcessor] XLSX extraction failed: ${error.message}`);
      }
    }
    /**
    * Get JSON metadata
    */
    async getJsonMetadata(buffer, _options) {
      try {
        const data = this.jsonProcessor.parse(buffer);
        const isArray = Array.isArray(data);
        return {
          format: "json",
          pages: void 0,
          custom: {
            isArray,
            itemCount: isArray ? data.length : Object.keys(data).length
          }
        };
      } catch {
        return {
          format: "json",
          pages: void 0
        };
      }
    }
    /**
    * Get CSV metadata
    */
    async getCsvMetadata(buffer, _options) {
      try {
        const info = this.csvProcessor.getColumnInfo(buffer);
        return {
          format: "csv",
          pages: void 0,
          custom: {
            rowCount: info.rowCount,
            columnCount: info.columnCount,
            headers: info.headers
          }
        };
      } catch {
        return {
          format: "csv",
          pages: void 0
        };
      }
    }
    /**
    * Get XLSX metadata
    */
    async getXlsxMetadata(buffer, _options) {
      if (!this.xlsxProcessor.isAvailable()) return {
        format: "xlsx",
        pages: void 0
      };
      try {
        const metadata = this.xlsxProcessor.getMetadata(buffer);
        return {
          format: "xlsx",
          pages: void 0,
          custom: {
            sheetNames: metadata.sheetNames,
            sheetCount: metadata.sheetCount
          }
        };
      } catch {
        return {
          format: "xlsx",
          pages: void 0
        };
      }
    }
    /**
    * Get OCR processor instance
    */
    getOCRProcessor() {
      return this.ocrProcessor;
    }
    /**
    * Get JSON processor instance
    */
    getJsonProcessor() {
      return this.jsonProcessor;
    }
    /**
    * Get CSV processor instance
    */
    getCsvProcessor() {
      return this.csvProcessor;
    }
    /**
    * Get XLSX processor instance
    */
    getXlsxProcessor() {
      return this.xlsxProcessor;
    }
  };
});
var document_exports = /* @__PURE__ */ __exportAll({
  CsvProcessor: () => CsvProcessor,
  DocumentProcessor: () => DocumentProcessor,
  JsonProcessor: () => JsonProcessor,
  OCRProcessor: () => OCRProcessor,
  XlsxProcessor: () => XlsxProcessor,
  createCsvProcessor: () => createCsvProcessor,
  createDocumentProcessor: () => createDocumentProcessor,
  createJsonProcessor: () => createJsonProcessor,
  createOCRProcessor: () => createOCRProcessor,
  createXlsxProcessor: () => createXlsxProcessor
});
var init_document = __esmMin(() => {
  init_DocumentProcessor();
  init_OCRProcessor();
  init_JsonProcessor();
  init_CsvProcessor();
  init_XlsxProcessor();
});
function createWorkerPool(config) {
  return new WorkerPool(config);
}
var WorkerPool;
var init_WorkerPool = __esmMin(() => {
  WorkerPool = class {
    constructor(config = {}) {
      this.workers = [];
      this.availableWorkers = [];
      this.taskQueue = [];
      this.totalProcessingTime = 0;
      this.config = {
        numWorkers: config.numWorkers || cpus().length,
        maxQueueSize: config.maxQueueSize || 100,
        idleTimeout: config.idleTimeout || 3e4
      };
      this.stats = {
        activeWorkers: 0,
        idleWorkers: 0,
        queueSize: 0,
        totalProcessed: 0,
        totalErrors: 0,
        avgProcessingTime: 0
      };
      this.workerPath = join2(__dirname, "worker.js");
    }
    /**
    * Initialize worker pool
    */
    async initialize() {
      for (let i = 0; i < this.config.numWorkers; i++) await this.createWorker();
    }
    /**
    * Create a new worker
    */
    async createWorker() {
      const worker = new Worker(this.workerPath);
      worker.on("message", (result) => {
        this.handleWorkerResult(worker, result);
      });
      worker.on("error", (error) => {
        console.error("[WorkerPool] Worker error:", error);
        this.stats.totalErrors++;
        this.removeWorker(worker);
        this.createWorker();
      });
      worker.on("exit", (code) => {
        if (code !== 0) console.error(`[WorkerPool] Worker exited with code ${code}`);
        this.removeWorker(worker);
      });
      this.workers.push(worker);
      this.availableWorkers.push(worker);
      this.stats.idleWorkers++;
      return worker;
    }
    /**
    * Execute a task on the worker pool
    */
    async execute(task) {
      if (this.taskQueue.length >= this.config.maxQueueSize) throw new Error(`[WorkerPool] Queue is full (max: ${this.config.maxQueueSize})`);
      return new Promise((resolve, reject) => {
        this.taskQueue.push({
          task,
          resolve,
          reject
        });
        this.stats.queueSize = this.taskQueue.length;
        this.processQueue();
      });
    }
    /**
    * Process task queue
    */
    processQueue() {
      while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.shift();
        const { task, resolve, reject } = this.taskQueue.shift();
        this.stats.idleWorkers--;
        this.stats.activeWorkers++;
        this.stats.queueSize = this.taskQueue.length;
        worker.__currentTask = {
          resolve,
          reject,
          startTime: Date.now()
        };
        worker.postMessage(task);
      }
    }
    /**
    * Handle worker result
    */
    handleWorkerResult(worker, result) {
      const currentTask = worker.__currentTask;
      if (!currentTask) return;
      this.stats.activeWorkers--;
      this.stats.idleWorkers++;
      this.stats.totalProcessed++;
      this.totalProcessingTime += result.processingTime;
      this.stats.avgProcessingTime = this.totalProcessingTime / this.stats.totalProcessed;
      this.availableWorkers.push(worker);
      delete worker.__currentTask;
      if (result.error) {
        this.stats.totalErrors++;
        currentTask.reject(new Error(result.error));
      } else currentTask.resolve(result.result);
      this.processQueue();
    }
    /**
    * Remove worker from pool
    */
    removeWorker(worker) {
      const index = this.workers.indexOf(worker);
      if (index !== -1) this.workers.splice(index, 1);
      const availableIndex = this.availableWorkers.indexOf(worker);
      if (availableIndex !== -1) {
        this.availableWorkers.splice(availableIndex, 1);
        this.stats.idleWorkers--;
      }
    }
    /**
    * Get pool statistics
    */
    getStats() {
      return { ...this.stats };
    }
    /**
    * Terminate all workers
    */
    async terminate() {
      const terminatePromises = this.workers.map((worker) => worker.terminate());
      await Promise.all(terminatePromises);
      this.workers = [];
      this.availableWorkers = [];
      this.taskQueue = [];
      this.stats.activeWorkers = 0;
      this.stats.idleWorkers = 0;
      this.stats.queueSize = 0;
    }
  };
});
var workers_exports = /* @__PURE__ */ __exportAll({
  WorkerPool: () => WorkerPool,
  createWorkerPool: () => createWorkerPool
});
var init_workers = __esmMin(() => {
  init_WorkerPool();
});
var OpenRedaction = class OpenRedaction2 {
  constructor(options = {}) {
    this.compiledPatterns = /* @__PURE__ */ new Map();
    this.valueToPlaceholder = /* @__PURE__ */ new Map();
    this.placeholderCounter = /* @__PURE__ */ new Map();
    this.options = {
      includeNames: true,
      includeAddresses: true,
      includePhones: true,
      includeEmails: true,
      patterns: [],
      categories: [],
      customPatterns: [],
      whitelist: [],
      deterministic: true,
      redactionMode: "placeholder",
      enableContextAnalysis: true,
      confidenceThreshold: 0.5,
      enableFalsePositiveFilter: true,
      falsePositiveThreshold: 0.7,
      enableMultiPass: false,
      multiPassCount: 3,
      enableCache: false,
      cacheSize: 100,
      enablePriorityOptimization: false,
      debug: false,
      maxInputSize: 10 * 1024 * 1024,
      regexTimeout: 100,
      ...options.preset ? getPreset(options.preset) : {},
      ...options,
      optimizerOptions: {
        learningWeight: options.optimizerOptions?.learningWeight ?? 0.3,
        minSampleSize: options.optimizerOptions?.minSampleSize ?? 10,
        maxPriorityAdjustment: options.optimizerOptions?.maxPriorityAdjustment ?? 15
      }
    };
    if (this.options.enableCache) this.resultCache = new LRUCache(this.options.cacheSize);
    if (this.options.enableMultiPass) this.multiPassConfig = createSimpleMultiPass({
      numPasses: this.options.multiPassCount,
      prioritizeCredentials: true
    });
    this.enableLearning = options.enableLearning ?? true;
    if (this.enableLearning) {
      this.learningStore = new LocalLearningStore(options.learningStorePath || ".openredaction/learnings.json", {
        autoSave: true,
        confidenceThreshold: 0.85
      });
      const learnedWhitelist = this.learningStore.getWhitelist();
      this.options.whitelist = [...this.options.whitelist, ...learnedWhitelist];
      if (this.options.enablePriorityOptimization) this.priorityOptimizer = createPriorityOptimizer(this.learningStore, this.options.optimizerOptions);
    }
    this.patterns = this.buildPatternList();
    this.validatePatterns();
    this.precompilePatterns();
    if (this.priorityOptimizer) this.patterns = this.priorityOptimizer.optimizePatterns(this.patterns);
    this.severityClassifier = new SeverityClassifier();
    this.patterns = this.severityClassifier.ensureAllSeverity(this.patterns);
    this.patterns.sort((a, b) => b.priority - a.priority);
    if (options.enableAuditLog) {
      this.auditLogger = options.auditLogger || new InMemoryAuditLogger();
      this.auditUser = options.auditUser;
      this.auditSessionId = options.auditSessionId;
      this.auditMetadata = options.auditMetadata;
    }
    if (options.enableMetrics) this.metricsCollector = options.metricsCollector || new InMemoryMetricsCollector();
    if (options.enableRBAC) if (options.rbacManager) this.rbacManager = options.rbacManager;
    else if (options.role) {
      const role = getPredefinedRole(options.role);
      if (role) this.rbacManager = new RBACManager(role);
    } else this.rbacManager = new RBACManager();
    if (options.enableNER) {
      this.nerDetector = new NERDetector();
      if (!this.nerDetector.isAvailable()) {
        console.warn("[OpenRedaction] NER enabled but compromise.js not installed. Install with: npm install compromise");
        console.warn("[OpenRedaction] Falling back to regex-only detection.");
        this.nerDetector = void 0;
      }
    }
    if (options.enableContextRules !== false) this.contextRulesEngine = new ContextRulesEngine(options.contextRulesConfig);
  }
  /**
  * Create OpenRedaction instance from config file
  */
  static async fromConfig(configPath) {
    const loader = new ConfigLoader(configPath);
    const config = await loader.load();
    if (!config) return new OpenRedaction2();
    return new OpenRedaction2({
      ...loader.resolveConfig(config),
      enableLearning: true,
      learningStorePath: config.learnedPatterns
    });
  }
  /**
  * Build the list of patterns based on options
  * Supports three filtering modes (in order of priority):
  * 1. Specific pattern types (patterns option)
  * 2. Pattern categories (categories option) - NEW!
  * 3. All patterns with type-specific filters (includeNames, etc.)
  */
  buildPatternList() {
    let patterns;
    if (this.options.patterns && this.options.patterns.length > 0) patterns = allPatterns.filter((p) => this.options.patterns.includes(p.type));
    else if (this.options.categories && this.options.categories.length > 0) {
      patterns = [];
      for (const category of this.options.categories) {
        const categoryPatterns = getPatternsByCategory(category);
        patterns.push(...categoryPatterns);
      }
      patterns = Array.from(new Map(patterns.map((p) => [p.type, p])).values());
      if (this.options.debug) console.log(`[OpenRedaction] Loaded ${patterns.length} patterns from categories: ${this.options.categories.join(", ")}`);
    } else patterns = allPatterns.filter((pattern) => {
      if (pattern.type === "NAME" && !this.options.includeNames) return false;
      if (pattern.type.startsWith("EMAIL") && !this.options.includeEmails) return false;
      if (pattern.type.startsWith("PHONE") && !this.options.includePhones) return false;
      if (pattern.type.startsWith("ADDRESS") && !this.options.includeAddresses) return false;
      if (pattern.type.startsWith("POSTCODE") && !this.options.includeAddresses) return false;
      if (pattern.type.startsWith("ZIP") && !this.options.includeAddresses) return false;
      return true;
    });
    if (this.options.customPatterns && this.options.customPatterns.length > 0) patterns.push(...this.options.customPatterns);
    return patterns;
  }
  /**
  * Validate all patterns to prevent malicious regex injection
  * ONLY validates custom patterns - built-in patterns are already vetted
  * Timeout protection in safeExec() is the primary defense against ReDoS
  */
  validatePatterns() {
    if (!this.options.customPatterns || this.options.customPatterns.length === 0) {
      if (this.options.debug) console.log(`[OpenRedaction] No custom patterns to validate. ${this.patterns.length} built-in patterns loaded.`);
      return;
    }
    for (const customPattern of this.options.customPatterns) try {
      validatePattern(customPattern.regex);
    } catch (error) {
      const errorMsg = `[OpenRedaction] Invalid custom pattern '${customPattern.type}': ${error.message}`;
      throw new Error(errorMsg);
    }
    if (this.options.debug) console.log(`[OpenRedaction] Validated ${this.options.customPatterns.length} custom patterns. Total patterns: ${this.patterns.length}`);
  }
  /**
  * Pre-compile all regex patterns for performance
  * Avoids creating new RegExp objects on every detect() call
  */
  precompilePatterns() {
    this.compiledPatterns.clear();
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      this.compiledPatterns.set(pattern, regex);
      if (this.options.debug && (pattern.type === "NINTENDO_FRIEND_CODE" || pattern.type === "TELECOMS_ACCOUNT_NUMBER")) console.log(`[OpenRedaction] Compiled pattern '${pattern.type}': ${regex}`);
    }
    if (this.options.debug) console.log(`[OpenRedaction] Pre-compiled ${this.compiledPatterns.size} regex patterns`);
  }
  /**
  * Process patterns and detect PII
  * Used by both single-pass and multi-pass detection
  */
  processPatterns(text, patterns, processedRanges) {
    let detections = [];
    for (const pattern of patterns) {
      const regex = this.compiledPatterns.get(pattern);
      if (!regex) {
        if (this.options.debug) console.warn(`[OpenRedaction] Pattern '${pattern.type}' not found in compiled cache, skipping`);
        continue;
      }
      if (this.options.debug && (pattern.type === "NINTENDO_FRIEND_CODE" || pattern.type === "TELECOMS_ACCOUNT_NUMBER")) console.log(`[OpenRedaction] Processing pattern '${pattern.type}' with regex: ${regex}`);
      let match;
      let matchCount = 0;
      const maxMatches = 1e4;
      regex.lastIndex = 0;
      try {
        while ((match = safeExec(regex, text, { timeout: this.options.regexTimeout })) !== null) {
          if (this.options.debug && (pattern.type === "NINTENDO_FRIEND_CODE" || pattern.type === "TELECOMS_ACCOUNT_NUMBER")) console.log(`[OpenRedaction] Pattern '${pattern.type}' regex match found: '${match[0]}' at position ${match.index}`);
          matchCount++;
          if (matchCount >= maxMatches) {
            if (this.options.debug) console.warn(`[OpenRedaction] Pattern '${pattern.type}' exceeded ${maxMatches} matches, stopping`);
            break;
          }
          const value = match[1] !== void 0 ? match[1] : match[0];
          const fullMatch = match[0];
          let startPos;
          let endPos;
          if (match[1] !== void 0) {
            const captureIndex = fullMatch.indexOf(value);
            startPos = match.index + captureIndex;
            endPos = startPos + value.length;
          } else {
            startPos = match.index;
            endPos = startPos + value.length;
          }
          if (this.overlapsWithExisting(startPos, endPos, processedRanges)) {
            if (this.options.debug) console.log(`[OpenRedaction] Pattern '${pattern.type}' skipped due to overlap at ${startPos}-${endPos}`);
            continue;
          }
          const contextStart = Math.max(0, startPos - 50);
          const contextEnd = Math.min(text.length, endPos + 50);
          const context = text.substring(contextStart, contextEnd);
          if (pattern.validator && !pattern.validator(value, context)) {
            if (this.options.debug) console.log(`[OpenRedaction] Pattern '${pattern.type}' validation failed for value: '${value}' with context: '${context.substring(0, 100)}...'`);
            continue;
          }
          if (this.options.enableFalsePositiveFilter) {
            const fpResult = isFalsePositive(value, pattern.type, context);
            if (fpResult.isFalsePositive && fpResult.confidence >= this.options.falsePositiveThreshold) continue;
          }
          let confidence = 1;
          if (this.options.enableContextAnalysis) {
            confidence = analyzeFullContext(text, value, pattern.type, startPos, endPos).confidence;
            if (this.options.debug && confidence < this.options.confidenceThreshold) console.log(`[OpenRedaction] Pattern '${pattern.type}' failed context analysis. Value: '${value}', Confidence: ${confidence} < ${this.options.confidenceThreshold}`);
          }
          if (this.contextRulesEngine) {
            const piiMatch = {
              type: pattern.type,
              value,
              start: startPos,
              end: endPos,
              confidence,
              context: {
                before: text.substring(Math.max(0, startPos - 250), startPos),
                after: text.substring(endPos, Math.min(text.length, endPos + 250))
              }
            };
            confidence = this.contextRulesEngine.applyProximityRules(piiMatch, text).confidence;
          }
          if (confidence < this.options.confidenceThreshold) continue;
          if (this.options.whitelist.some((term) => value.toLowerCase().includes(term.toLowerCase()))) continue;
          const placeholder = this.generatePlaceholder(value, pattern);
          if (this.options.debug) console.log(`[OpenRedaction] Pattern '${pattern.type}' detected: '${value}' at position ${startPos}-${endPos}, confidence: ${confidence}`);
          detections.push({
            type: pattern.type,
            value,
            placeholder,
            position: [startPos, endPos],
            severity: pattern.severity || "medium",
            confidence
          });
          processedRanges.push([startPos, endPos]);
        }
      } catch (error) {
        if (error instanceof RegexTimeoutError) {
          if (this.options.debug) console.warn(`[OpenRedaction] ${error.message}`);
          continue;
        }
        throw error;
      }
    }
    if (this.nerDetector && this.nerDetector.isAvailable()) {
      const nerMatches = this.nerDetector.detect(text);
      let piiMatches = detections.map((det) => ({
        type: det.type,
        value: det.value,
        start: det.position[0],
        end: det.position[1],
        confidence: det.confidence || 1,
        context: {
          before: text.substring(Math.max(0, det.position[0] - 50), det.position[0]),
          after: text.substring(det.position[1], Math.min(text.length, det.position[1] + 50))
        }
      }));
      if (detections.length > 0) {
        const hybridMatches = this.nerDetector.hybridDetection(piiMatches, text);
        detections = detections.map((det, index) => ({
          ...det,
          confidence: hybridMatches[index].confidence
        }));
        piiMatches = detections.map((det) => ({
          type: det.type,
          value: det.value,
          start: det.position[0],
          end: det.position[1],
          confidence: det.confidence || 1,
          context: {
            before: text.substring(Math.max(0, det.position[0] - 50), det.position[0]),
            after: text.substring(det.position[1], Math.min(text.length, det.position[1] + 50))
          }
        }));
      }
      const nerOnly = this.nerDetector.extractNEROnly(nerMatches, piiMatches);
      for (const ner of nerOnly) {
        const syntheticPattern = {
          type: `NER_${ner.type}`,
          regex: /.^/,
          priority: 1,
          placeholder: `[NER_${ner.type}_{n}]`,
          severity: "medium"
        };
        const placeholder = this.generatePlaceholder(ner.text, syntheticPattern);
        detections.push({
          type: syntheticPattern.type,
          value: ner.text,
          placeholder,
          position: [ner.start, ner.end],
          severity: "medium",
          confidence: ner.confidence
        });
      }
    }
    if (this.contextRulesEngine && detections.length > 0) {
      const piiMatches = detections.map((det) => ({
        type: det.type,
        value: det.value,
        start: det.position[0],
        end: det.position[1],
        confidence: det.confidence || 1,
        context: {
          before: text.substring(Math.max(0, det.position[0] - 50), det.position[0]),
          after: text.substring(det.position[1], Math.min(text.length, det.position[1] + 50))
        }
      }));
      const boostedMatches = this.contextRulesEngine.applyDomainBoosting(piiMatches, text);
      detections = detections.map((det, index) => ({
        ...det,
        confidence: boostedMatches[index].confidence
      }));
    }
    return detections;
  }
  /**
  * Detect PII in text
  * Async API for detection pipeline (NER, multi-pass, etc.)
  */
  async detect(text) {
    if (this.rbacManager && !this.rbacManager.hasPermission("detection:detect")) throw new Error("[OpenRedaction] Permission denied: detection:detect required");
    const startTime = performance.now();
    const textSize = new Blob([text]).size;
    if (textSize > this.options.maxInputSize) throw new Error(`[OpenRedaction] Input size (${textSize} bytes) exceeds maximum allowed size (${this.options.maxInputSize} bytes). Set maxInputSize option to increase limit or use streaming/batch processing for large documents.`);
    if (textSize > this.options.maxInputSize * 0.8 && this.options.debug) console.warn(`[OpenRedaction] Input size (${textSize} bytes) is approaching maximum limit (${this.options.maxInputSize} bytes)`);
    if (this.options.debug) {
      console.log(`[OpenRedaction] Detecting PII in ${textSize} byte text`);
      console.log(`[OpenRedaction] Active patterns: ${this.patterns.length}`);
      console.log(`[OpenRedaction] Multi-pass: ${this.options.enableMultiPass ? "enabled" : "disabled"}`);
      console.log(`[OpenRedaction] Cache: ${this.options.enableCache ? "enabled" : "disabled"}`);
    }
    if (this.resultCache) {
      const cacheKey = hashString(text);
      const cached = this.resultCache.get(cacheKey);
      if (cached) {
        if (this.options.debug) console.log("[OpenRedaction] Cache hit, returning cached result");
        return cached;
      }
    }
    if (!this.options.deterministic) {
      this.placeholderCounter.clear();
      this.valueToPlaceholder.clear();
    }
    let detections;
    const processedRanges = [];
    if (this.options.enableMultiPass && this.multiPassConfig) {
      const patternGroups = groupPatternsByPass(this.patterns, this.multiPassConfig);
      const passDetections = /* @__PURE__ */ new Map();
      for (const pass of this.multiPassConfig) {
        const passPatterns = patternGroups.get(pass.name) || [];
        if (passPatterns.length === 0) continue;
        const currentDetections = this.processPatterns(text, passPatterns, processedRanges);
        passDetections.set(pass.name, currentDetections);
        for (const detection of currentDetections) processedRanges.push(detection.position);
      }
      detections = mergePassDetections(passDetections, this.multiPassConfig);
    } else detections = this.processPatterns(text, this.patterns, processedRanges);
    detections.sort((a, b) => b.position[0] - a.position[0]);
    let redacted = text;
    const redactionMap = {};
    for (const detection of detections) {
      if (!detection.value) continue;
      const escapedValue = this.escapeRegex(detection.value);
      const pattern = new RegExp(escapedValue, "gi");
      redacted = redacted.replace(pattern, detection.placeholder);
      redactionMap[detection.placeholder] = detection.value;
    }
    const endTime = performance.now();
    const processingTime = Math.round((endTime - startTime) * 100) / 100;
    const result = {
      original: text,
      redacted,
      detections: detections.reverse(),
      redactionMap,
      stats: {
        processingTime,
        piiCount: detections.length
      }
    };
    if (this.options.debug) {
      console.log(`[OpenRedaction] Detection complete: ${detections.length} PII found in ${processingTime}ms`);
      if (detections.length > 0) {
        const typeCounts = {};
        for (const detection of detections) typeCounts[detection.type] = (typeCounts[detection.type] || 0) + 1;
        console.log(`[OpenRedaction] Detection breakdown:`, typeCounts);
      }
    }
    if (this.auditLogger) try {
      const piiTypes = [...new Set(detections.map((d) => d.type))];
      this.auditLogger.log({
        operation: "redact",
        piiCount: detections.length,
        piiTypes,
        textLength: text.length,
        processingTimeMs: processingTime,
        redactionMode: this.options.redactionMode,
        success: true,
        user: this.auditUser,
        sessionId: this.auditSessionId,
        metadata: this.auditMetadata
      });
    } catch (error) {
      if (this.options.debug) console.error("[OpenRedaction] Audit logging failed:", error);
    }
    if (this.metricsCollector) try {
      this.metricsCollector.recordRedaction(result, processingTime, this.options.redactionMode);
    } catch (error) {
      if (this.options.debug) console.error("[OpenRedaction] Metrics recording failed:", error);
    }
    if (this.resultCache) {
      const cacheKey = hashString(text);
      this.resultCache.set(cacheKey, result);
      if (this.options.debug) console.log("[OpenRedaction] Result cached");
    }
    return result;
  }
  /**
  * Restore redacted text using redaction map
  */
  restore(redactedText, redactionMap) {
    if (this.rbacManager && !this.rbacManager.hasPermission("detection:restore")) throw new Error("[OpenRedaction] Permission denied: detection:restore required");
    const startTime = performance.now();
    let restored = redactedText;
    for (const [placeholder, value] of Object.entries(redactionMap)) restored = restored.replace(new RegExp(this.escapeRegex(placeholder), "g"), value);
    const endTime = performance.now();
    const processingTime = Math.round((endTime - startTime) * 100) / 100;
    if (this.auditLogger) try {
      this.auditLogger.log({
        operation: "restore",
        piiCount: Object.keys(redactionMap).length,
        piiTypes: [],
        textLength: redactedText.length,
        processingTimeMs: processingTime,
        success: true,
        user: this.auditUser,
        sessionId: this.auditSessionId,
        metadata: this.auditMetadata
      });
    } catch (error) {
      if (this.options.debug) console.error("[OpenRedaction] Audit logging failed:", error);
    }
    return restored;
  }
  /**
  * Generate placeholder for a detected value
  */
  generatePlaceholder(value, pattern) {
    if (this.options.deterministic && this.valueToPlaceholder.has(value)) return this.valueToPlaceholder.get(value);
    let placeholder;
    if (this.options.redactionMode !== "placeholder") {
      placeholder = applyRedactionMode(value, pattern.type, this.options.redactionMode, pattern.placeholder);
      this.valueToPlaceholder.set(value, placeholder);
      return placeholder;
    }
    if (this.options.deterministic) {
      const id = generateDeterministicId(value, pattern.type);
      placeholder = pattern.placeholder.replace("{n}", id);
    } else {
      const count = (this.placeholderCounter.get(pattern.type) || 0) + 1;
      this.placeholderCounter.set(pattern.type, count);
      placeholder = pattern.placeholder.replace("{n}", count.toString());
    }
    this.valueToPlaceholder.set(value, placeholder);
    return placeholder;
  }
  /**
  * Check if a range overlaps with existing detections
  */
  overlapsWithExisting(start, end, ranges) {
    return ranges.some(([existingStart, existingEnd]) => start >= existingStart && start < existingEnd || end > existingStart && end <= existingEnd || start <= existingStart && end >= existingEnd);
  }
  /**
  * Escape special regex characters
  */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
  * Get the list of active patterns
  */
  getPatterns() {
    return [...this.patterns];
  }
  /**
  * Get severity-based scan results
  */
  async scan(text) {
    const result = await this.detect(text);
    return {
      high: result.detections.filter((d) => d.severity === "high"),
      medium: result.detections.filter((d) => d.severity === "medium"),
      low: result.detections.filter((d) => d.severity === "low"),
      total: result.detections.length
    };
  }
  /**
  * Record a false positive (incorrectly detected as PII)
  */
  recordFalsePositive(detection, context) {
    if (!this.learningStore) throw createLearningDisabledError();
    const ctx = context || "";
    this.learningStore.recordFalsePositive(detection.value, detection.type, ctx);
    if (this.learningStore.getConfidence(detection.value) >= 0.85) this.options.whitelist.push(detection.value);
  }
  /**
  * Record a false negative (missed PII that should have been detected)
  */
  recordFalseNegative(text, expectedType, context) {
    if (!this.learningStore) throw createLearningDisabledError();
    const ctx = context || "";
    this.learningStore.recordFalseNegative(text, expectedType, ctx);
  }
  /**
  * Record a correct detection (for accuracy tracking)
  */
  recordCorrectDetection() {
    if (!this.learningStore) return;
    this.learningStore.recordCorrectDetection();
  }
  /**
  * Get learning statistics
  */
  getLearningStats() {
    if (!this.learningStore) return null;
    return this.learningStore.getStats();
  }
  /**
  * Get learned whitelist entries
  */
  getLearnedWhitelist() {
    if (!this.learningStore) return [];
    return this.learningStore.getWhitelistEntries();
  }
  /**
  * Get pattern adjustment suggestions
  */
  getPatternAdjustments() {
    if (!this.learningStore) return [];
    return this.learningStore.getPatternAdjustments();
  }
  /**
  * Export learned patterns for sharing
  */
  exportLearnings(options) {
    if (!this.learningStore) return null;
    return this.learningStore.export(options);
  }
  /**
  * Import learned patterns from another source
  */
  importLearnings(data, merge = true) {
    if (!this.learningStore) throw createLearningDisabledError();
    this.learningStore.import(data, merge);
    const learnedWhitelist = this.learningStore.getWhitelist();
    this.options.whitelist = [.../* @__PURE__ */ new Set([...this.options.whitelist, ...learnedWhitelist])];
  }
  /**
  * Manually add a term to the whitelist
  */
  addToWhitelist(pattern, confidence = 0.9) {
    if (!this.learningStore) {
      this.options.whitelist.push(pattern);
      return;
    }
    this.learningStore.addToWhitelist(pattern, confidence);
    this.options.whitelist.push(pattern);
  }
  /**
  * Remove a term from the whitelist
  */
  removeFromWhitelist(pattern) {
    if (this.learningStore) this.learningStore.removeFromWhitelist(pattern);
    this.options.whitelist = this.options.whitelist.filter((w) => w !== pattern);
  }
  /**
  * Get the learning store instance
  */
  getLearningStore() {
    return this.learningStore;
  }
  /**
  * Get the priority optimizer instance
  */
  getPriorityOptimizer() {
    return this.priorityOptimizer;
  }
  /**
  * Optimize pattern priorities based on learning data
  * Call this to re-optimize priorities after accumulating new learning data
  */
  optimizePriorities() {
    if (!this.priorityOptimizer) throw createOptimizationDisabledError();
    this.patterns = this.priorityOptimizer.optimizePatterns(this.patterns);
    this.patterns.sort((a, b) => b.priority - a.priority);
    if (this.resultCache) this.resultCache.clear();
  }
  /**
  * Get pattern statistics with learning data
  */
  getPatternStats() {
    if (!this.priorityOptimizer) return null;
    return this.priorityOptimizer.getPatternStats(this.patterns);
  }
  /**
  * Clear the result cache (if caching is enabled)
  */
  clearCache() {
    if (this.resultCache) this.resultCache.clear();
  }
  /**
  * Get cache statistics
  */
  getCacheStats() {
    return {
      size: this.resultCache?.size || 0,
      maxSize: this.options.cacheSize,
      enabled: this.options.enableCache
    };
  }
  /**
  * Get the audit logger instance (if audit logging is enabled)
  */
  getAuditLogger() {
    if (this.rbacManager && !this.rbacManager.hasPermission("audit:read")) throw new Error("[OpenRedaction] Permission denied: audit:read required");
    return this.auditLogger;
  }
  /**
  * Get the metrics collector instance (if metrics collection is enabled)
  */
  getMetricsCollector() {
    if (this.rbacManager && !this.rbacManager.hasPermission("metrics:read")) throw new Error("[OpenRedaction] Permission denied: metrics:read required");
    return this.metricsCollector;
  }
  /**
  * Get the RBAC manager instance (if RBAC is enabled)
  */
  getRBACManager() {
    return this.rbacManager;
  }
  /**
  * Create an explain API for debugging detections
  */
  explain() {
    return createExplainAPI(this);
  }
  /**
  * Generate a report from detection results
  */
  generateReport(result, options) {
    return createReportGenerator(this).generate(result, options);
  }
  /**
  * Export current configuration
  */
  exportConfig(metadata) {
    const { ConfigExporter: ConfigExporter2 } = (init_ConfigExporter(), __toCommonJS(ConfigExporter_exports));
    return ConfigExporter2.exportToString(this.options, metadata, true);
  }
  /**
  * Run health check
  */
  async healthCheck(options) {
    const { HealthChecker: HealthChecker2 } = await Promise.resolve().then(() => (init_HealthCheck(), HealthCheck_exports));
    return new HealthChecker2(this).check(options);
  }
  /**
  * Quick health check (minimal overhead)
  */
  async quickHealthCheck() {
    const { HealthChecker: HealthChecker2 } = await Promise.resolve().then(() => (init_HealthCheck(), HealthCheck_exports));
    return new HealthChecker2(this).quickCheck();
  }
  /**
  * Detect PII in a document (PDF, DOCX, TXT)
  * Requires optional peer dependencies:
  * - pdf-parse for PDF support
  * - mammoth for DOCX support
  */
  async detectDocument(buffer, options) {
    if (this.rbacManager && !this.rbacManager.hasPermission("detection:detect")) throw new Error("[OpenRedaction] Permission denied: detection:detect required");
    const { createDocumentProcessor: createDocumentProcessor2 } = await Promise.resolve().then(() => (init_document(), document_exports));
    const processor = createDocumentProcessor2();
    const extractionStart = performance.now();
    const text = await processor.extractText(buffer, options);
    const metadata = await processor.getMetadata(buffer, options);
    const extractionEnd = performance.now();
    const extractionTime = Math.round((extractionEnd - extractionStart) * 100) / 100;
    return {
      text,
      metadata,
      detection: await this.detect(text),
      fileSize: buffer.length,
      extractionTime
    };
  }
  /**
  * Detect PII in a document file from filesystem
  * Convenience method that reads file and calls detectDocument
  */
  async detectDocumentFile(filePath, options) {
    if (this.rbacManager && !this.rbacManager.hasPermission("detection:detect")) throw new Error("[OpenRedaction] Permission denied: detection:detect required");
    const buffer = await (await import("fs/promises")).readFile(filePath);
    return this.detectDocument(buffer, options);
  }
  /**
  * Batch detect PII in multiple texts using worker threads (parallel)
  * Significantly faster for processing many texts
  */
  static async detectBatch(texts, options) {
    const { createWorkerPool: createWorkerPool2 } = await Promise.resolve().then(() => (init_workers(), workers_exports));
    const pool = createWorkerPool2({ numWorkers: options?.numWorkers });
    try {
      await pool.initialize();
      const tasks = texts.map((text, index) => ({
        type: "detect",
        id: `detect_${index}`,
        text,
        options
      }));
      return await Promise.all(tasks.map((task) => pool.execute(task)));
    } finally {
      await pool.terminate();
    }
  }
  /**
  * Batch process multiple documents using worker threads (parallel)
  * Efficient for processing many documents at once
  */
  static async detectDocumentsBatch(buffers, options) {
    const { createWorkerPool: createWorkerPool2 } = await Promise.resolve().then(() => (init_workers(), workers_exports));
    const pool = createWorkerPool2({ numWorkers: options?.numWorkers });
    try {
      await pool.initialize();
      const tasks = buffers.map((buffer, index) => ({
        type: "document",
        id: `document_${index}`,
        buffer,
        options
      }));
      return await Promise.all(tasks.map((task) => pool.execute(task)));
    } finally {
      await pool.terminate();
    }
  }
};
init_document();
init_workers();
init_ConfigExporter();
init_HealthCheck();

// src/redact.ts
function isRedactionEnabled() {
  return (process.env.SEQ_REDACTION_ENABLED ?? "true").toLowerCase() !== "false";
}
function isValidNorwegianFnr(match) {
  const digits = match.replace(/\s/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const d = digits.split("").map(Number);
  if (d[0] < 8) {
    let day = d[0] * 10 + d[1];
    if (day > 40) day -= 40;
    let month = d[2] * 10 + d[3];
    if (month > 40) month -= 40;
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || month < 1 || month > 12 || day > daysInMonth[month - 1]) return false;
  }
  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let sum1 = 0;
  for (let i = 0; i < 9; i++) sum1 += d[i] * w1[i];
  let k1 = 11 - sum1 % 11;
  if (k1 === 11) k1 = 0;
  if (k1 === 10 || k1 !== d[9]) return false;
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 10; i++) sum2 += d[i] * w2[i];
  let k2 = 11 - sum2 % 11;
  if (k2 === 11) k2 = 0;
  if (k2 === 10 || k2 !== d[10]) return false;
  return true;
}
var NORWEGIAN_FNR_PATTERN = {
  type: "NO_FNR",
  regex: /\b\d{6}\s?\d{5}\b/g,
  priority: 100,
  validator: (value) => isValidNorwegianFnr(value),
  placeholder: "[FNR_{n}]",
  description: "Norwegian national identity number (f\xF8dselsnummer) or D-number",
  severity: "critical"
};
var NORWEGIAN_PHONE_PATTERN = {
  type: "PHONE_NO",
  // Separators are literal spaces (not \s) so a match never spans the
  // SEGMENT_DELIMITERS (tab/CR/LF) used by redactText — keeping that invariant
  // true. Norwegian numbers are grouped with spaces, not tabs/newlines. The
  // +47/0047 branch is fenced with digit lookarounds so it cannot match a
  // partial slice of a longer digit run (e.g. "+47 1234567890").
  regex: /(?<!\d)(?:\+47|0047) ?\d(?: ?\d){7}(?!\d)|\b\d{2} \d{2} \d{2} \d{2}\b|\b\d{3} \d{2} \d{3}\b|\b[49]\d{7}\b/g,
  priority: 80,
  validator: (value) => {
    const digits = value.replace(/\D/g, "");
    const normalized = digits.startsWith("0047") ? digits.slice(2) : digits;
    return normalized.length === 8 || normalized.length === 10 && normalized.startsWith("47");
  },
  placeholder: "[PHONE_{n}]",
  description: "Norwegian phone number",
  severity: "high"
};
var NORWEGIAN_NAMES = /* @__PURE__ */ new Set(
  [
    // Common first names
    "anne",
    "inger",
    "kari",
    "marit",
    "ingrid",
    "liv",
    "eva",
    "berit",
    "astrid",
    "bj\xF8rg",
    "hilde",
    "anna",
    "solveig",
    "randi",
    "gerd",
    "nina",
    "marianne",
    "kristin",
    "elisabeth",
    "ida",
    "maria",
    "hanne",
    "else",
    "tone",
    "ellen",
    "wenche",
    "turid",
    "sissel",
    "grete",
    "bente",
    "heidi",
    "camilla",
    "silje",
    "julie",
    "emma",
    "sofie",
    "nora",
    "ingeborg",
    "linda",
    "monica",
    "hege",
    "trine",
    "mette",
    "jan",
    "per",
    "bj\xF8rn",
    "ole",
    "ola",
    "lars",
    "kjell",
    "knut",
    "svein",
    "arne",
    "hans",
    "odd",
    "tor",
    "geir",
    "tom",
    "rolf",
    "morten",
    "terje",
    "thomas",
    "martin",
    "andreas",
    "anders",
    "magnus",
    "kristian",
    "henrik",
    "erik",
    "espen",
    "fredrik",
    "jonas",
    "marius",
    "daniel",
    "h\xE5kon",
    "jens",
    "nils",
    "petter",
    "stian",
    "trond",
    "vidar",
    "\xF8yvind",
    "rune",
    "sander",
    "mathias",
    "jakob",
    "emil",
    "oliver",
    "filip",
    "noah",
    "william",
    "olav",
    "sigurd",
    "gunnar",
    "harald",
    "leif",
    "egil",
    // Common surnames
    "hansen",
    "johansen",
    "olsen",
    "larsen",
    "andersen",
    "pedersen",
    "nilsen",
    "kristiansen",
    "jensen",
    "karlsen",
    "johnsen",
    "pettersen",
    "eriksen",
    "berg",
    "haugen",
    "hagen",
    "johannessen",
    "andreassen",
    "jacobsen",
    "dahl",
    "j\xF8rgensen",
    "halvorsen",
    "lund",
    "solberg",
    "moen",
    "eide",
    "strand",
    "bakken",
    "kristoffersen",
    "mathisen",
    "lie",
    "iversen",
    "rasmussen",
    "gundersen",
    "holm",
    "lunde",
    "aas",
    "moe",
    "vik",
    "antonsen",
    "ellingsen",
    "nordmann"
  ]
);
var AMBIGUOUS_NAMES = /* @__PURE__ */ new Set([
  "else",
  "per",
  "tom",
  "odd",
  "tor",
  "berg",
  "strand",
  "holm",
  "lund",
  "lie",
  "moe",
  "vik",
  "dahl",
  "hagen"
]);
var NAME_TOKEN = /[A-ZÆØÅ][a-zæøåäöéèü]+/g;
function nameKey(token) {
  let hash = 0;
  const lc = token.toLowerCase();
  for (let i = 0; i < lc.length; i++) hash = hash * 31 + lc.charCodeAt(i) >>> 0;
  return String(hash % 1e4).padStart(4, "0");
}
function redactNorwegianNames(text) {
  const tokens = [];
  NAME_TOKEN.lastIndex = 0;
  let match;
  while ((match = NAME_TOKEN.exec(text)) !== null) {
    tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }
  const isDictName = (value) => NORWEGIAN_NAMES.has(value.toLowerCase());
  const adjacent = (self, neighbour, side) => {
    if (!neighbour || !isDictName(neighbour.value)) return false;
    const gap = side === "before" ? text.slice(neighbour.end, self.start) : text.slice(self.end, neighbour.start);
    return /^[ -]$/.test(gap);
  };
  const toRedact = /* @__PURE__ */ new Set();
  for (let i = 0; i < tokens.length; i++) {
    const lc = tokens[i].value.toLowerCase();
    if (!isDictName(lc)) continue;
    if (!AMBIGUOUS_NAMES.has(lc)) {
      toRedact.add(i);
    } else if (adjacent(tokens[i], tokens[i - 1], "before") || adjacent(tokens[i], tokens[i + 1], "after")) {
      toRedact.add(i);
    }
  }
  if (toRedact.size === 0) return text;
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (!toRedact.has(i)) continue;
    out += text.slice(cursor, tokens[i].start) + `[NAME_${nameKey(tokens[i].value)}]`;
    cursor = tokens[i].end;
  }
  return out + text.slice(cursor);
}
var detector = null;
function getDetector() {
  if (!detector) {
    detector = new OpenRedaction({
      // Whitelist only the built-in EMAIL pattern. The library's broader
      // built-in detection (NER names, social handles, UK/US phones) produced
      // noisy false positives on Norwegian log text — e.g. mangling ordinary
      // words into [IG_USER_n] and flagging "Gateway" as a name — and its
      // UK/US phone patterns over-match long digit runs. Identity and phone
      // numbers are handled by the Norwegian-tuned custom patterns; person
      // names are handled separately by redactNorwegianNames.
      patterns: ["EMAIL"],
      customPatterns: [NORWEGIAN_FNR_PATTERN, NORWEGIAN_PHONE_PATTERN],
      redactionMode: "placeholder"
      // Audit logging, metrics, webhooks and RBAC are intentionally left at
      // their defaults (all off) so redaction stays fully in-process — no
      // log data is sent anywhere.
    });
  }
  return detector;
}
var SEGMENT_DELIMITERS = /([;|\r\n\t]+)/;
async function redactText(text) {
  if (!isRedactionEnabled() || !text) return text;
  const parts = text.split(SEGMENT_DELIMITERS);
  const detector2 = getDetector();
  const out = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (index % 2 === 1 || part === "") {
      out.push(part);
    } else {
      const detected = (await detector2.detect(part)).redacted;
      out.push(redactNorwegianNames(detected));
    }
  }
  return out.join("");
}
async function redactDeep(value) {
  if (!isRedactionEnabled()) return value;
  if (typeof value === "string") {
    return await redactText(value);
  }
  if (Array.isArray(value)) {
    const arr = [];
    for (const item of value) arr.push(await redactDeep(item));
    return arr;
  }
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = await redactDeep(val);
    }
    return out;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    const raw = String(Math.abs(value));
    const candidate = raw.length === 11 ? raw : raw.length === 10 ? `0${raw}` : null;
    if (candidate) {
      const redacted = await redactText(candidate);
      if (redacted !== candidate) return redacted;
    }
    return value;
  }
  return value;
}

// src/timerange.ts
var RANGE_MS = {
  "1m": 6e4,
  "15m": 15 * 6e4,
  "30m": 30 * 6e4,
  "1h": 36e5,
  "2h": 2 * 36e5,
  "6h": 6 * 36e5,
  "12h": 12 * 36e5,
  "1d": 864e5,
  "7d": 7 * 864e5,
  "14d": 14 * 864e5,
  "30d": 30 * 864e5
};
var DEFAULT_QUERY_RANGE_MS = RANGE_MS["1d"];
function resolveDataRange(input, now) {
  const { range, fromDateUtc, toDateUtc } = input;
  if (range) {
    return {
      rangeStartUtc: new Date(now - RANGE_MS[range]).toISOString(),
      rangeEndUtc: new Date(now).toISOString()
    };
  }
  if (fromDateUtc || toDateUtc) {
    const parsedTo = toDateUtc ? Date.parse(toDateUtc) : now;
    const endMs = Number.isNaN(parsedTo) ? now : parsedTo;
    return {
      rangeStartUtc: fromDateUtc ?? new Date(endMs - DEFAULT_QUERY_RANGE_MS).toISOString(),
      rangeEndUtc: toDateUtc ?? new Date(now).toISOString()
    };
  }
  return {
    rangeStartUtc: new Date(now - DEFAULT_QUERY_RANGE_MS).toISOString(),
    rangeEndUtc: new Date(now).toISOString()
  };
}

// src/seq-server.ts
var SEQ_BASE_URL = process.env.SEQ_BASE_URL || "http://localhost:8080";
var SEQ_API_KEY = process.env.SEQ_API_KEY || "";
var MAX_EVENTS = 50;
var CHARACTER_LIMIT = 25e3;
if (!SEQ_API_KEY) {
  console.error("Warning: SEQ_API_KEY is not set. Some Seq instances require authentication.");
}
var server = new McpServer({
  name: "seq-mcp-server",
  version: "1.0.0"
});
async function makeSeqRequest(endpoint, params = {}) {
  const url = new URL(`${SEQ_BASE_URL}${endpoint}`);
  if (SEQ_API_KEY) {
    url.searchParams.append("apiKey", SEQ_API_KEY);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  const headers = {
    "Accept": "application/json"
  };
  if (SEQ_API_KEY) {
    headers["X-Seq-ApiKey"] = SEQ_API_KEY;
  }
  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
    }
    throw new Error(`Seq API error ${response.status} (${response.statusText})${body ? `: ${body}` : ""}`);
  }
  return response.json();
}
server.resource(
  "signals",
  "seq://signals",
  {
    description: "List of saved Seq signals that can be used with seq_get_events to filter log events by category or service"
  },
  async () => {
    try {
      const signals = await makeSeqRequest("/api/signals", { shared: "true" });
      const formattedSignals = signals.map((signal) => ({
        id: signal.Id,
        title: signal.Title,
        description: signal.Description || "No description provided",
        shared: signal.IsShared,
        ownerId: signal.OwnerId
      }));
      const safeSignals = await redactDeep(formattedSignals);
      return {
        contents: [{
          uri: "seq://signals",
          text: JSON.stringify(safeSignals, null, 2)
        }]
      };
    } catch (error) {
      console.error("Error fetching signals:", error);
      throw error;
    }
  }
);
var timeRangeSchema = z.enum(["1m", "15m", "30m", "1h", "2h", "6h", "12h", "1d", "7d", "14d", "30d"]);
var signalsSchema = z.object({
  ownerId: z.string().optional().describe("Filter signals by owner ID"),
  shared: z.boolean().optional().describe("Filter by shared status. Defaults to true (shared signals only)"),
  partial: z.boolean().optional().describe("Include partial signal matches")
}).strict();
var eventsSchema = z.object({
  signal: z.string().optional().describe("Comma-separated signal IDs to scope results (get IDs from seq_get_signals)"),
  filter: z.string().optional().describe(`Seq filter expression, e.g. "@Level = 'Error'" or "StatusCode >= 500"`),
  count: z.number().min(1).max(MAX_EVENTS).optional().default(20).describe(`Number of events to return (1\u2013${MAX_EVENTS}, default 20)`),
  fromDateUtc: z.string().optional().describe('Start of time range in UTC ISO 8601, e.g. "2024-01-15T10:00:00Z"'),
  toDateUtc: z.string().optional().describe('End of time range in UTC ISO 8601, e.g. "2024-01-15T11:00:00Z"'),
  range: timeRangeSchema.optional().describe("Relative time range; takes precedence over fromDateUtc/toDateUtc. Options: 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d"),
  after: z.string().optional().describe("Pagination cursor: pass the last event ID from a previous response to fetch the next page"),
  render: z.boolean().optional().default(false).describe("Render message templates into human-readable strings (adds RenderedMessage to each event)")
}).strict();
var dataSchema = z.object({
  query: z.string().min(1).describe(
    `Seq SQL query. Use 'from stream' for tabular/aggregate queries, e.g. "select count(*) from stream group by @Level" or "select RequestPath, count(*) from stream where StatusCode >= 500 group by RequestPath order by count(*) desc limit 20". Supports aggregate operators (count, sum, mean, percentile, distinct) and time slicing via group by time(<n><unit>). Add a 'limit' clause to bound large rowsets.`
  ),
  signal: z.string().optional().describe("Comma-separated signal IDs to scope the query (get IDs from get_signals)"),
  fromDateUtc: z.string().optional().describe('Start of time range in UTC ISO 8601, e.g. "2024-01-15T10:00:00Z"'),
  toDateUtc: z.string().optional().describe('End of time range in UTC ISO 8601, e.g. "2024-01-15T11:00:00Z"'),
  range: timeRangeSchema.optional().describe("Relative time range; takes precedence over fromDateUtc/toDateUtc. Options: 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d. Defaults to the last 24h (1d) when omitted")
}).strict();
server.tool(
  "get_signals",
  "List saved Seq signals (named filters). Use signal IDs with get_events to narrow results to a specific service or category.",
  signalsSchema.shape,
  async ({ ownerId, shared, partial }) => {
    try {
      const params = {
        shared: shared?.toString() ?? "true"
      };
      if (ownerId) params.ownerId = ownerId;
      if (partial !== void 0) params.partial = partial.toString();
      const signals = await makeSeqRequest("/api/signals", params);
      const normalized = signals.map((s) => ({
        id: s.Id,
        title: s.Title,
        description: s.Description,
        shared: s.IsShared,
        ownerId: s.OwnerId,
        filters: s.Filters
      }));
      const safeSignals = await redactDeep(normalized);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(safeSignals, null, 2)
        }]
      };
    } catch (error) {
      const err = error;
      return {
        content: [{
          type: "text",
          text: `Error fetching signals: ${err.message}. Verify SEQ_BASE_URL (${SEQ_BASE_URL}) is correct and the server is reachable.`
        }],
        isError: true
      };
    }
  }
);
server.tool(
  "get_events",
  `Retrieve structured log events from Seq. Use to investigate errors, analyze patterns, or monitor application health.

Tips:
- Call get_signals first to find signal IDs for targeted filtering
- Start with a broad time range, then narrow using filter expressions
- Filter expressions use Seq query syntax, e.g.: @Level = 'Error', StatusCode >= 500, RequestPath like '/api/%'
- Combine signal + filter for precise results
- Use render=true to get human-readable rendered messages instead of raw message templates
- Use the 'after' parameter with the last event ID to page through large result sets`,
  eventsSchema.shape,
  async ({ signal, filter, count, fromDateUtc, toDateUtc, range, after, render }) => {
    try {
      const params = {};
      if (range) {
        params.range = range;
      } else if (fromDateUtc || toDateUtc) {
        if (fromDateUtc) params.fromDateUtc = fromDateUtc;
        if (toDateUtc) params.toDateUtc = toDateUtc;
      } else {
        params.range = "1h";
      }
      if (signal) params.signal = signal;
      if (filter) params.filter = filter;
      if (count) params.count = count.toString();
      if (after) params.after = after;
      if (render) params.render = "true";
      const events = await makeSeqRequest("/api/events", params);
      const safeEvents = await redactDeep(events);
      let text = JSON.stringify(safeEvents, null, 2);
      let truncated = false;
      while (text.length > CHARACTER_LIMIT && safeEvents.length > 1) {
        safeEvents.splice(Math.ceil(safeEvents.length / 2));
        text = JSON.stringify(safeEvents, null, 2);
        truncated = true;
      }
      if (truncated) {
        const meta = { truncated: true, returned: safeEvents.length, truncation_message: `Response exceeded ${CHARACTER_LIMIT} characters. Reduce 'count', narrow the time 'range', or add a 'filter' expression to get more targeted results.` };
        text = JSON.stringify({ ...meta, events: safeEvents }, null, 2);
      }
      return {
        content: [{
          type: "text",
          text
        }]
      };
    } catch (error) {
      const err = error;
      return {
        content: [{
          type: "text",
          text: `Error fetching events: ${err.message}. Check that filter syntax is valid Seq query syntax and that any signal IDs exist (use get_signals to list them).`
        }],
        isError: true
      };
    }
  }
);
server.tool(
  "get_alert_state",
  "Get the current state of all Seq alerts. Returns firing, ok, or suppressed status for each configured alert.",
  {},
  async () => {
    try {
      const alertState = await makeSeqRequest("/api/alertstate");
      const safeAlertState = await redactDeep(alertState);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(safeAlertState, null, 2)
        }]
      };
    } catch (error) {
      const err = error;
      return {
        content: [{
          type: "text",
          text: `Error fetching alert state: ${err.message}. Verify the Seq server is reachable at ${SEQ_BASE_URL}.`
        }],
        isError: true
      };
    }
  }
);
server.tool(
  "sql_query",
  `Run a Seq SQL-style query for aggregations and tabular analysis (https://datalust.co/docs/sql-queries).

Use this \u2014 not get_events \u2014 when you need counts, sums, means, percentiles, distinct values, group-by breakdowns, or time-series. get_events returns raw rows; sql_query computes the aggregate server-side, avoiding pulling and counting rows client-side.

Examples:
- Errors per service: select ServiceName, count(*) from stream where @Level = 'Error' group by ServiceName order by count(*) desc
- p95 latency over time: select percentile(Elapsed, 95) from stream group by time(5m)
- Top failing endpoints: select RequestPath, count(*) from stream where StatusCode >= 500 group by RequestPath order by count(*) desc limit 20

Tips:
- Call get_signals first to scope the query to a service/category via the 'signal' parameter
- Default time window is the last 24h; set 'range' or fromDateUtc/toDateUtc to change it
- Add a 'limit' clause to large rowsets, or group at a coarser level, if results are truncated`,
  dataSchema.shape,
  async ({ query, signal, fromDateUtc, toDateUtc, range }) => {
    try {
      const { rangeStartUtc, rangeEndUtc } = resolveDataRange(
        { range, fromDateUtc, toDateUtc },
        Date.now()
      );
      const params = {
        q: query,
        rangeStartUtc,
        rangeEndUtc
      };
      if (signal) params.signal = signal;
      const data = await makeSeqRequest("/api/data", params);
      const safeData = await redactDeep(data);
      let text = JSON.stringify(safeData, null, 2);
      if (text.length > CHARACTER_LIMIT && Array.isArray(safeData.Rows) && safeData.Rows.length > 1) {
        const rows = safeData.Rows;
        const withMeta = () => ({
          truncated: true,
          returnedRows: rows.length,
          truncation_message: `Response exceeded ${CHARACTER_LIMIT} characters and rows were truncated. Add a 'limit' clause, narrow the time range, or group at a coarser level.`,
          ...safeData
        });
        text = JSON.stringify(withMeta(), null, 2);
        while (text.length > CHARACTER_LIMIT && rows.length > 1) {
          rows.splice(Math.ceil(rows.length / 2));
          text = JSON.stringify(withMeta(), null, 2);
        }
      }
      return {
        content: [{
          type: "text",
          text
        }]
      };
    } catch (error) {
      const err = error;
      return {
        content: [{
          type: "text",
          text: `Error running query: ${err.message}. Check the SQL syntax (see https://datalust.co/docs/sql-queries) \u2014 use 'from stream' for tabular/aggregate queries \u2014 and that any signal IDs exist (use get_signals to list them).`
        }],
        isError: true
      };
    }
  }
);
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
process.stdin.on("close", () => {
  console.error("Seq MCP Server closed");
  server.close();
});
var seq_server_default = server;
export {
  seq_server_default as default
};
