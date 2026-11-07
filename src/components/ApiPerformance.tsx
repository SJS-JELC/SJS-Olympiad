import {useState} from 'react';
import {clearApiTimings,recentActionTimings,recentApiTimings} from '../cloud/performance';
import {performanceReport} from '../cloud/performance-report';
import type {DiagnosticSnapshot} from '../cloud/api';

/** Mounted only inside the teacher diagnostics panel; refreshing this view performs no API call. */
export function ApiPerformance({snapshot}:{snapshot?:DiagnosticSnapshot}){
 const [requests,setRequests]=useState(recentApiTimings),[actions,setActions]=useState(recentActionTimings);
 const [copyState,setCopyState]=useState(''),[manualCopy,setManualCopy]=useState('');
 function refresh(){setRequests(recentApiTimings());setActions(recentActionTimings());}
 async function copy(){
  const report=performanceReport(snapshot);refresh();setCopyState('Copying…');setManualCopy('');
  try{await navigator.clipboard.writeText(report);setCopyState('Performance report copied.');}
  catch{setCopyState('Clipboard unavailable. Select and copy the report below.');setManualCopy(report);}
 }
 return <section aria-label="API performance">
  <h3 className="type-heading">API performance</h3>
  <p className="type-caption">This browser only · latest 100 requests and roster actions · milliseconds. Server time excludes browser/network overhead. Parallel calls overlap.</p>
  <button type="button" className="ui-button" onClick={refresh}>Refresh timing view</button>{' '}
  <button type="button" className="ui-button" onClick={()=>{clearApiTimings();refresh();}}>Clear local timings</button>{' '}
  <button type="button" className="ui-button" disabled={copyState==='Copying…'} onClick={()=>void copy()}>Copy performance report</button>
  <p className="type-caption">Copy includes current browser timings and the latest loaded server snapshot. Refresh backend settings after reproducing the action, then copy.</p>
  {copyState&&<p className="type-caption" role="status">{copyState}</p>}
  {manualCopy&&<textarea aria-label="Performance report for manual copying" readOnly value={manualCopy} rows={8} style={{width:'100%',boxSizing:'border-box'}} onFocus={event=>event.currentTarget.select()}/>}
  <table><caption>Complete roster actions</caption><thead><tr><th>Action</th><th>Elapsed ms</th><th>Outcome</th></tr></thead><tbody>
   {actions.map((item,index)=><tr key={index}><td>{item.action}</td><td>{item.durationMs.toFixed(1)}</td><td>{item.outcome}</td></tr>)}
  </tbody></table>
  <table><caption>Recent API requests</caption><thead><tr><th>Action</th><th>Browser ms</th><th>Server ms</th><th>Status</th><th>Request ID</th></tr></thead><tbody>
   {requests.map((item,index)=><tr key={index}><td>{item.action}</td><td>{item.durationMs.toFixed(1)}</td><td>{item.serverMs?.toFixed(1)??'—'}</td><td>{item.status??'—'} · {item.outcome}</td><td>{item.requestId??'—'}</td></tr>)}
  </tbody></table>
 </section>;
}
