import {h} from "@virtualstate/focus";
import {prepare} from "../prepare";
import {union} from "@virtualstate/union";

const root = (
    <root>
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
        <top>
            <p first>
                Paragraph 1
            </p>
            <p>
                Paragraph 2
            </p>
            <p last>
                Paragraph 3
            </p>
        </top>
    </root>
)

{
    const query = prepare(root, `input[type="number"][value >= 1][value <= 2] || input[type="checkbox"][checked] || another input || another top() deep input`)

    console.log({
        query
    });

    let snapshot;

    for await (snapshot of query) {
        console.log("snapshot", snapshot);
    }
    console.log("final", snapshot);

}

{

    const query = prepare(
        root,
        `another > tree input[type="number"][value=2]`
    )

    let snapshot;
    for await (snapshot of query) {
        console.log("snapshot", snapshot);
    }
    console.log("final", snapshot);

}

{

    const query = prepare(
        root,
        `another + deep tree > jump input[type="checkbox"]`
    )

    let snapshot;
    for await (snapshot of query) {
        console.log("snapshot", snapshot);
    }
    console.log("final", snapshot);
}


{

    const query = prepare(
        root,
        `input ~ input`
    )

    let snapshot;
    for await (snapshot of query) {
        console.log("snapshot", snapshot);
    }
    console.log("final", snapshot);
}



{

    const query = prepare(
        root,
        `p[first] ~ p[last]`
    )

    let snapshot;
    for await (snapshot of query) {
        console.log("snapshot", snapshot);
    }
    console.log("final", snapshot);
}
