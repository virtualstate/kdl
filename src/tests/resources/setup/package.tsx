import {createToken} from "@virtualstate/fringe";
import {h} from "../../../static-h";

const Package = createToken("package");

const name = <name>foo</name>
const version = <version>1.0.0</version>
const windowsDependencies = (
    <dependencies platform="windows">
        <winapi path="./crates/my-winapi-fork">1.0.0</winapi>
    </dependencies>
);
const defaultDependencies = (
    <dependencies>
        <miette dev={true}>2.0.0</miette>
    </dependencies>
);
const dependencies = [windowsDependencies, defaultDependencies];
const lastBuiltAt = <lastBuiltAt>{12345}</lastBuiltAt>

export const packageDocument = (
    <Package>
        {name}
        {version}
        {dependencies}
        {lastBuiltAt}
    </Package>
);

export const packageQueries = [
    `top() > package dependencies[prop(platform) = "windows"]`,
    `top() > package dependencies[prop(platform) != "windows"]`,
    `top() > package dependencies[prop(platform) != r#"windows"#] || top() > package dependencies[prop(platform) = "windows"]`,
    `dependencies`,
    `dependencies[prop(platform) ^= "win"]`,
    `dependencies[prop(platform) $= "s"]`,
    `dependencies[prop(platform) *= "in"]`,
    `dependencies[prop(platform)]`,
    `dependencies[platform]`,
    `dependencies[platform = "windows"]`,
    `lastBuiltAt[val() > 0]`,
    `lastBuiltAt[val() >= 0]`,
    `lastBuiltAt[val() < 9999999]`,
    `lastBuiltAt[val() <= 9999999]`,
    `dependencies + dependencies`,
    `version ~ dependencies`,
    `dependencies[prop(platform) ^= "win"] top() package > version`
] as const;

type Outputs<Queries extends ReadonlyArray<string>> = {
    [K in keyof Queries]: unknown;
} & { length: Queries["length"] }

export const packageOutputs: Outputs<typeof packageQueries> = [
    windowsDependencies,
    defaultDependencies,
    [defaultDependencies, windowsDependencies],
    dependencies,
    windowsDependencies,
    windowsDependencies,
    windowsDependencies,
    windowsDependencies,
    windowsDependencies,
    windowsDependencies,
    lastBuiltAt,
    lastBuiltAt,
    lastBuiltAt,
    lastBuiltAt,
    defaultDependencies,
    dependencies,
    version
] as const;