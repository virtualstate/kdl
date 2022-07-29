import { query } from "../tokenizer";

for (const token of query(
  `name > top() [prop("a") = 1] another(tagged)[values()] with[type="checkbox"][checked=true] || with[type="checkbox"][checked=false] || input[type="number"][val()=1][val()<5]`
)) {
  console.log(token);
}
