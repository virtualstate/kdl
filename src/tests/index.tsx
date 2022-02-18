import {toGenericNodeChildren, toKDLString} from "../index";
import {h} from "../static-h";
import {f} from "@virtualstate/fringe";
import {createToken} from "@virtualstate/fringe";
import {rawKDLQuery} from "../query";

export default 1;

const Package = createToken("package");

const PackageTree = (
    <Package>
        <name>foo</name>
        <version>1.0.0</version>
        <dependencies platform="windows">
            <winapi path="./crates/my-winapi-fork">1.0.0</winapi>
        </dependencies>
        <dependencies>
            <miette dev={true}>2.0.0</miette>
        </dependencies>
        <lastBuiltAt>{12345}</lastBuiltAt>
    </Package>
)

console.log(await toKDLString(PackageTree));

for await (const string of toKDLString(PackageTree)) {
    console.log(string);
}

const multiTree = {
    source: "name",
    options: {
        attribute: "value",
        value: 1
    },
    children: [
        {
            type: "main",
            children: [
                {
                    $$type: "section",
                    props: {
                        id: "main-section"
                    },
                    children: {
                        async *[Symbol.asyncIterator]() {
                            yield [
                                {
                                    type: "h1",
                                    children: [
                                        "hello",
                                        "world"
                                    ]
                                },
                                "whats up"
                            ]
                        }
                    }
                }
            ]
        }
    ]
}

for await (const string of toKDLString(multiTree)) {
    console.log(string);
}

const queries = [
    `top() > package dependencies[prop(platform) = "windows"]`,
    `top() > package dependencies[prop(platform) != "windows"]`,
    `top() > package dependencies[prop(platform) != r#"windows"#] || top() > package dependencies[prop(platform) = "windows"]`,
    `dependencies`,
    `dependencies[prop(platform) ^= "win"]`,
    `dependencies[prop(platform) $= "s"]`,
    `dependencies[prop(platform) *= "in"]`,
    `lastBuiltAt[val() > 0]`,
    `lastBuiltAt[val() >= 0]`,
    `lastBuiltAt[val() < 9999999]`,
    `lastBuiltAt[val() <= 9999999]`
]

const Query = rawKDLQuery`top() > package dependencies[prop(platform) = "windows"]`;
const result = {
    name: Symbol.for(":kdl/fragment"),
    children: {
        [Symbol.asyncIterator]() {
            return Query({}, PackageTree)[Symbol.asyncIterator]()
        }
    }
};
console.log("result1", await toKDLString(result));

for (const query of queries) {
    const Query3 = rawKDLQuery(query);
    const result3 = {
        name: Symbol.for(":kdl/fragment"),
        children: {
            [Symbol.asyncIterator]() {
                return Query3({}, PackageTree)[Symbol.asyncIterator]()
            }
        }
    };
    console.log("result3", await toKDLString(result3));
}
const Query4 = rawKDLQuery`section`;
const result4 = {
    name: Symbol.for(":kdl/fragment"),
    children: {
        [Symbol.asyncIterator]() {
            return Query4({}, multiTree)[Symbol.asyncIterator]()
        }
    }
};
console.log("result4", await toKDLString(result4));

const Query5 = rawKDLQuery`section[prop(id) = "main-section"] h1`;
const result5 = {
    name: Symbol.for(":kdl/fragment"),
    children: {
        [Symbol.asyncIterator]() {
            return Query5({}, multiTree)[Symbol.asyncIterator]()
        }
    }
};
console.log("result5", await toKDLString(result5));