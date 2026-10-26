package com.bjjj.todo;
import android.app.job.*;
public class SyncJob extends JobService {
 public boolean onStartJob(JobParameters p){CloudSync.executor.execute(()->{boolean retry=false;try{CloudSync.run(getApplicationContext());}catch(Exception e){retry=true;}jobFinished(p,retry);});return true;}
 public boolean onStopJob(JobParameters p){return true;}
}
