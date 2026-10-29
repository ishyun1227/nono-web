/* Pure, deterministic validation used BEFORE any production Firebase write.
 * Plan only absent children; preserve every existing child and reject conflicts.
 */
'use strict';
function planMissingPackedAnswers(existing,desired){
 if(existing!==null&&(typeof existing!=='object'||Array.isArray(existing)))
   throw new TypeError('Unexpected privateAnswersPacked root format');
 if(!desired||typeof desired!=='object'||Array.isArray(desired))
   throw new TypeError('Invalid packed answer manifest');
 const current=existing||Object.create(null);
 const missing=[];
 for(const [id,packed] of Object.entries(desired)){
  if(!/^[a-z][a-z0-9_-]{2,79}$/.test(id)||typeof packed!=='string'||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(packed))
   throw new TypeError('Invalid private packed answer entry: '+id);
  if(Object.hasOwn(current,id)){
   if(current[id]!==packed)throw new Error('Existing private packed answer differs, refusing to overwrite: '+id);
  }else missing.push([id,packed]);
 }
 return missing;
}
module.exports={planMissingPackedAnswers};
