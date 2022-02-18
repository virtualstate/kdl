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
    </Package>
)

console.log(await toKDLString(PackageTree));

for await (const string of toKDLString(PackageTree)) {
    console.log(string);
}

for await (const string of toKDLString({
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
                    children: (async function *() {
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
                    })()
                }
            ]
        }
    ]
})) {
    console.log(string);
}

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
//
// const Query2 = rawKDLQuery`top() > package dependencies[prop(platform) = "windows"] + dependencies`;
// const result2 = {
//     name: Symbol.for(":kdl/fragment"),
//     children: {
//         [Symbol.asyncIterator]() {
//             return Query2({}, PackageTree)[Symbol.asyncIterator]()
//         }
//     }
// };
// console.log("result2", await toKDLString(result2));