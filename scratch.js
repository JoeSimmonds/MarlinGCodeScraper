import * as cheerio from 'cheerio';

const $ = cheerio.load(`
<ul>
  <li>One</li>
  <li>Two</li>
  <li class="blue sel">Three</li>
  <li class="red">Four</li>
</ul>
`);


const data = $.extract({
  codeNames: ['ul>li']
});

console.log(data)