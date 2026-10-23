package com.bjjj.todo;
import android.app.*;import android.appwidget.*;import android.content.*;import android.net.Uri;import android.os.*;import android.provider.Settings;import android.webkit.*;import android.widget.Toast;import org.json.*;import java.nio.charset.StandardCharsets;
public class MainActivity extends Activity {
 WebView web;boolean create;
 public void onCreate(Bundle state){super.onCreate(state);create=getIntent().getBooleanExtra("create",false);web=new WebView(this);web.setBackgroundColor(0xff0d1a20);web.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});if(Build.VERSION.SDK_INT<30)web.setFitsSystemWindows(true);setContentView(web);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);web.addJavascriptInterface(new Bridge(),"Native");web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}public void onPageFinished(WebView v,String url){if(create){v.evaluateJavascript("editTask()",null);create=false;}}});try{String html=new java.util.Scanner(getAssets().open("index.html"),"UTF-8").useDelimiter("\\A").next();web.loadDataWithBaseURL("https://bjjj.invalid/",html,"text/html","UTF-8",null);}catch(Exception e){throw new IllegalStateException(e);}Reminder.schedule(this);}
 protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("if(window.refresh)refresh()",null);TodoWidget.updateAll(this);Reminder.schedule(this);}
 public void onRequestPermissionsResult(int r,String[] permissions,int[] result){super.onRequestPermissionsResult(r,permissions,result);Reminder.schedule(this);if(web!=null)web.evaluateJavascript("refresh()",null);}
 class Bridge {
  @JavascriptInterface public String call(String action,String data){try{JSONObject p=new JSONObject(data),result=new JSONObject();switch(action){
   case "get": result=Store.read(MainActivity.this);result.put("notifications",Reminder.allowed(MainActivity.this));result.put("exact",Build.VERSION.SDK_INT<31||getSystemService(AlarmManager.class).canScheduleExactAlarms());break;
   case "save":Store.save(MainActivity.this,p);Store.changed(MainActivity.this);break;
   case "done":Store.done(MainActivity.this,p.getString("id"),p.getBoolean("done"));Store.changed(MainActivity.this);break;
   case "delete":Store.delete(MainActivity.this,p.getString("id"));Store.changed(MainActivity.this);break;
   case "settings":synchronized(Store.class){JSONObject r=Store.read(MainActivity.this);r.getJSONObject("settings").put("opacity",Math.max(0,Math.min(100,p.getInt("opacity"))));Store.write(MainActivity.this,r);}TodoWidget.updateAll(MainActivity.this);break;
   case "pin":runOnUiThread(()->{AppWidgetManager m=AppWidgetManager.getInstance(MainActivity.this);if(m.isRequestPinAppWidgetSupported())m.requestPinAppWidget(new ComponentName(MainActivity.this,TodoWidget.class),null,null);else new AlertDialog.Builder(MainActivity.this).setTitle("添加到桌面").setMessage("长按桌面空白处 → 小组件 → 不急及及代办，拖到空白页，再长按拉伸边框。").setPositiveButton("知道了",null).show();});break;
   case "notification":runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},10);else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));});break;
   case "exact":runOnUiThread(()->{if(Build.VERSION.SDK_INT>=31)startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));});break;
   default:throw new Exception("不支持的操作");
  }return new JSONObject().put("ok",true).put("data",result).toString();}catch(Exception e){try{return new JSONObject().put("ok",false).put("error",e.getMessage()).toString();}catch(Exception ignored){return "{\"ok\":false}";}}}
 }
 protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Native");web.destroy();}super.onDestroy();}
}
