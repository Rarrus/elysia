/* eslint-disable sonarjs/no-nested-switch */
/* eslint-disable sonarjs/no-duplicate-string */
import { serialize } from "cookie";
import { StatusMap } from "./utils";

import { Cookie } from "./cookies";

import type { Context } from "./context";
import type { LocalHook } from "./types";
import { ElysiaCustomStatusResponse } from "./error";
