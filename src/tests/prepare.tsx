import {h} from "@virtualstate/focus";
import {prepare} from "../prepare";

const root = (
    <tree>
        <input type="text" value="text value!" />
        <input type="checkbox" checked />
        <input type="checkbox" checked={false} />
    </tree>
)

const query = prepare(root, `name > top() [prop("a") = 1] another(tagged)[values()] with[type="checkbox"][checked=true] || with[type="checkbox"][checked=false] || input[type="number"][val()=1][val()<5]`)

console.log({
    query
});