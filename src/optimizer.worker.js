import {optimize} from './core.js';
self.onmessage=e=>{try{self.postMessage({result:optimize(e.data.items,e.data.offers,e.data.suppliers)})}catch(err){self.postMessage({error:err.message})}};
