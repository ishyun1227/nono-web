/* Immutable rabbit/samurai source answers for validation and optional
 * protected Firebase seeding. NOT a playable engine, and never shipped to dist.
 * The former standalone playtest HTML is permanently deleted.
 */
'use strict';
const bits=require('../answer-bitpack.js');
const DATA={
  "rabbit": {
    "width": 53,
    "height": 73,
    "total": 1069,
    "packed": "AAHAAAAAAAAfgAAABwAA/wAAAPwAB/wAAB/wAH/wAAH/gAPPwAAf/AAePwAB8OAAcPwAHwcAA4PgAfA4ABwfgB8DwADgfAHwHAAHA/APAOAAOA+A+AcAAOB8B4B4AAcD4DwDgAA8H4PgHAAA4PweAeAAB4fg8A4AABw/B4DwAABx//wPAAADz//g8AAAD/APDwAAAD4AHPAAAAHAAH8AAAAcAAHwAAAAwAAHAAAADgAAOAAAAGAAAMAAAAc4AAYAAAAzwAY4AAADngB5wAAAOPADxgAAA4eAHjAAABg8APDAAADAxweGAAAOAD4YGAAAcAHgAMAAA4BGAAYAAAwDcQAwAABwH/gDgAADgAOAHAAAPgAAAcAAB/wAABwAAHj4AAHAAAeH8AB+AAB4PwAH8AADgfAAAcAD+AeAAAYAP8A8AAAwA/wA4AABgB/gAwAADAH+BAAAAGAPwDgAAAMAfgDgAAAcA+ADgAgA4B8AHgBgB4B4AHADAHwBgAPADIMwDAAeAHwZgGAA8APBzAOAB8AeDmAMAD4A4GcAYAP4BwMwA4A/wDgb4A4D/gGA/8B4AHgOAwcBwAHAOBwcBgAmAMBiYDAZMBYjEwHgy8yxmbgH//5l//+AD/+////4AAAAf8AAAA=="
  },
  "samurai": {
    "width": 72,
    "height": 72,
    "total": 2136,
    "packed": "AAAAfAAAAAAAAAAB/4AAAAAAAAAD/4AAAAAAAAAH/8AAAAAAAAAD/4AAAAAAAAAH+PwAAAAAAAAH8/+AAAAAAAAP//3gAAAAAAAP//7wAAAAAAAP///wAAAAAAAGeD/4AAAAAAAC/9/8AAAAAAAB/5B+AAAAAAAB/zAeAAAAAAAD/6APAAAAAAAD/zgPAAAAAAAHv34PAAAAAAAH/ke9AAAAAAAH3p95AAAAAAAHvgJ5AAAAAAAHvgApAAAAAAADtgAoAAAAAAADlgCoAAAAAAABxgDoAAAAAAAD/AAIAAAAAAAD/APQAAAAAAAA9AAQAAAAAAAA8ACQAAAAAAAA8cAgAAAAAAAAEPgwGAAAAAAAED/8/AAAAAAAcB/N/AAAAAAD8B+//4AAAAPHsj59/uAAAAP/u3T74DAAAAf/mcnzgfgAAA/7mZPmH/wAAD/7zyfAfwIAACB3zm/B+AMAAP43xM+TwAGAAY/n6J+bAAGAAQDv+T/9gB+AAwDv/+A/gf/AAgH8AAAfz/9gB8HB//+f/+AgB//f//+f/gAwD/+f///f8AAQCB+////fcAB4GAe//AffOA/4EA94AABfeP/4MA9AAABef/+MP99AH//O//AEP/9P///u/wAGI/5////u7gACYD7////n5wAfYD7//z/35wP/QD7/+j/zzz/8+H/wAmwbz//4//eAB84dz/4MP/eH/9v83/gMD/e///v/n+AGDPO///P/n8AGGHu///5/34AiGD+///7//wf/MB//AA+f/j//J4/gAAe//P/+f+fD///k+f/+f/vf///s94H8P//////8/wQ8P///AAH53j+MP/+AAAHz7H/8P/+AAACD/P/8"
  }
};
function curatedPlaytestAnswers(){
 const expected={rabbit:[53,73,1069],samurai:[72,72,2136]};
 return Object.entries(DATA).map(([label,p])=>{
  const {width,height,total,packed}=p;
  if([width,height,total].join(',')!==expected[label]?.join(','))throw Error('Source dimensions changed: '+label);
  const mask=bits.unpack(packed,width,height);
  if(mask.split('1').length-1!==total)throw Error('Black pixel count mismatch: '+label);
  const {rows,cols}=bits.hints(mask,width,height);
  if(bits.validateAnswer(mask,width,height,rows,cols)!==packed)throw Error('Unstable source bits: '+label);
  return {id:'trial_'+label+'_'+width+'x'+height,width,height,mask,rows,cols};
 });
}
module.exports={curatedPlaytestAnswers};
