import {useState} from 'react';
import {clearApiTimings,recentActionTimings,recentApiTimings} from '../cloud/performance';

/** Mounted only inside the teacher diagnostics panel; refreshing this view performs no API call. */
export function ApiPerformance(){
 const [requests,setRequests]=useState(recentApiTimings),[actions,setActions]=useState(recentActionTimings);
 function refresh(){setRequests(recentApiTimings());setActions(recentActionTimings());}
 return <section aria-label="API performance">
  <h3 className="type-heading">API performance</h3>
  <p className="type-caption">This browser only · latest 100 requests and roster actions · milliseconds. Server time excludes browser/network overhead. Parallel calls overlap.</p>
  <button type="button" className="ui-button" onClick={refresh}>Refresh timing view</button>{' '}
  <button type="button" className="ui-button" onClick={()=>{clearApiTimings();refresh();}}>Clear local timings</button>
  <table><caption>Complete roster actions</caption><thead><tr><th>Action</th><th>Elapsed ms</th><th>Outcome</th></tr></thead><tbody>
   {actions.map((item,index)=><tr key={index}><td>{item.action}</td><td>{item.durationMs.toFixed(1)}</td><td>{item.outcome}</td></tr>)}
  </tbody></table>
  <table><caption>Recent API requests</caption><thead><tr><th>Action</th><th>Browser ms</th><th>Server ms</th><th>Status</th><th>Request ID</th></tr></thead><tbody>
   {requests.map((item,index)=><tr key={index}><td>{item.action}</td><td>{item.durationMs.toFixed(1)}</td><td>{item.serverMs?.toFixed(1)??'—'}</td><td>{item.status??'—'} · {item.outcome}</td><td>{item.requestId??'—'}</td></tr>)}
  </tbody></table>
 </section>;
}
