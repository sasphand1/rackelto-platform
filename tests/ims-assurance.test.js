const test=require('node:test'),assert=require('node:assert/strict');const {zip,hash,csv,gaps,packageEvidence}=require('../ims/archive');
test('archive signatures and traversal rejection',()=>{const b=zip({'a.txt':'hello'});assert.equal(b.readUInt32LE(0),0x04034b50);assert.equal(b.readUInt32LE(b.length-22),0x06054b50);assert.throws(()=>zip({'../x':'bad'}));});
test('CSV formula injection protected',()=>assert.match(csv([{x:'=SUM(A1)'}]),/"'=SUM/));
test('stale evidence cannot remain effective',()=>assert.equal(gaps([{status:'verified',evidence_valid:0}])[0].effective_status,'evidence_invalid'));
test('export manifest and no certification claim',()=>{const b=packageEvidence({controls:[],records:[],documents:[],operations:{},reviews:[],releases:[]});assert.ok(b.includes(Buffer.from('manifest.json')));assert.ok(b.includes(Buffer.from('Not certification')));assert.equal(hash(b).length,64);});
