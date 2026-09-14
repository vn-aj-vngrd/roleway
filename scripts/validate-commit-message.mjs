#!/usr/bin/env node

import { readFileSync } from "node:fs";

const argument = process.argv[2];
const isPullRequest = argument === "--pr-title";
if (!argument) throw new Error("Expected a commit message file or --pr-title.");

// Read PR metadata as data, never interpolate an untrusted title into shell code.
const message = isPullRequest
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).pull_request
      ?.title
  : readFileSync(argument, "utf8");
const subject =
  typeof message === "string" ? message.split("\n", 1)[0].trim() : "";
const conventional =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9][a-z0-9._/-]*\))?!?: \S.*$/u;
// Git-generated maintenance commits are allowed locally, never as PR titles.
const generated = /^(Merge |Revert ")/u;
const valid =
  conventional.test(subject) || (!isPullRequest && generated.test(subject));

if (!valid || (isPullRequest && /[\r\n]/u.test(message ?? ""))) {
  console.error(
    "Use <type>(optional-scope): Summary, e.g. feat: Add invitations or fix(games): Align tabs. Put ticket references in the body. See docs/DEVELOPMENT_WORKFLOW.md."
  );
  process.exitCode = 1;
}
