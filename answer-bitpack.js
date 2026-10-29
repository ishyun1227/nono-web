/* Lossless NONO answer codec, compatible with browser and Node.js.
 * A single contiguous row-major bit stream, most-significant bit first.
 * No per-row padding. Unused low bits of final byte MUST be zero.
 * The Firebase privateAnswersPacked path contains only the canonical base64.
 */
(function(root,factory){
  const codec=factory();
  if(typeof module==='object'&&module.exports)module.exports=codec;
  if(root)root.NONO_ANSWER_BITS=Object.freeze(codec);
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const FORMAT='nono-1bit-msb-v1';
  function dimensions(width,height){
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
       width<1||height<1||width*height>16384)
      throw new RangeError('Invalid nonogram dimensions');
    return width*height;
  }
  function bytesToBase64(bytes){
    if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');
    let raw='';
    for(const byte of bytes)raw+=String.fromCharCode(byte);
    return btoa(raw);
  }
  function base64ToBytes(value){
    if(typeof value!=='string'||!value||
       !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
      throw new TypeError('Invalid base64 answer');
    if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(value,'base64'));
    const raw=atob(value),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function pack(mask,width,height){
    const n=dimensions(width,height);
    if(typeof mask!=='string'||mask.length!==n||!/^[01]+$/.test(mask))
      throw new TypeError('Answer must be a 0/1 string with exact dimensions');
    const bytes=new Uint8Array(Math.ceil(n/8));
    for(let i=0;i<n;i++)if(mask.charCodeAt(i)===49)bytes[i>>3]|=128>>(i&7);
    return bytesToBase64(bytes);
  }
  function unpack(packed,width,height){
    const n=dimensions(width,height),bytes=base64ToBytes(packed);
    if(bytes.length!==Math.ceil(n/8)||bytesToBase64(bytes)!==packed)
      throw new TypeError('Answer byte length or base64 canonical form mismatch');
    const unused=(8-(n&7))&7;
    if(unused&&(bytes[bytes.length-1]&((1<<unused)-1))!==0)
      throw new TypeError('Nonzero padding bits at end of answer');
    let mask='';
    for(let i=0;i<n;i++)mask+=(bytes[i>>3]&(128>>(i&7)))?'1':'0';
    return mask;
  }
  function read(value,width,height){
    const n=dimensions(width,height);
    if(typeof value==='string'&&value.length===n&&/^[01]+$/.test(value))return value;
    return unpack(value,width,height);
  }
  function hints(mask,width,height){
    const n=dimensions(width,height);
    if(typeof mask!=='string'||mask.length!==n||!/^[01]+$/.test(mask))
      throw new TypeError('Invalid answer for clue calculation');
    function runs(bits){
      const out=[];let count=0;
      for(const bit of bits){if(bit==='1')count++;else if(count){out.push(count);count=0;}}
      if(count)out.push(count);
      return out.length?out:[0];
    }
    const rows=Array.from({length:height},(_,r)=>runs(mask.slice(r*width,(r+1)*width)));
    const cols=Array.from({length:width},(_,c)=>runs(Array.from({length:height},(_,r)=>mask[r*width+c])));
    return {rows,cols};
  }
  function validateAnswer(mask,width,height,rows,cols){
    const calculated=hints(mask,width,height);
    if(!Array.isArray(rows)||!Array.isArray(cols)||rows.length!==height||cols.length!==width)
      throw new TypeError('Clue dimensions do not match answer');
    for(const [actual,expected] of [[calculated.rows,rows],[calculated.cols,cols]]){
      for(let i=0;i<actual.length;i++){
        if(!Array.isArray(expected[i])||actual[i].join(',')!==expected[i].join(','))
          throw new TypeError('Clues do not match answer at line '+(i+1));
      }
    }
    const packed=pack(mask,width,height);
    if(unpack(packed,width,height)!==mask)
      throw new TypeError('Answer failed lossless round-trip');
    return packed;
  }
  return Object.freeze({FORMAT,pack,unpack,read,hints,validateAnswer});
});
