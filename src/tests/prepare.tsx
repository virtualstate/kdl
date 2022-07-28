import {h} from "@virtualstate/focus";
import {prepare} from "../prepare";
import {union} from "@virtualstate/union";

const root = (
    <tree>
        <another>
            <tree>
                <jump>
                    <input type="number" value={2} />
                    <input type="number" value={3} />
                </jump>
            </tree>
        </another>
        <deep>
            <tree>
                <jump>
                    <input type="checkbox" checked />
                </jump>
            </tree>
        </deep>
    </tree>
)

const query = prepare(root, `input[type="number"][value >= 1][value <= 2] || input[type="checkbox"][checked] || another input || another top() deep input`)

console.log({
    query
});

let snapshot;

for await (snapshot of query) {
    console.log("snapshot", snapshot);
}
console.log("final", snapshot);