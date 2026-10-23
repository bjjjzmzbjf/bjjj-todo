package com.bjjj.todo;
import android.widget.*;import android.content.*;import org.json.*;import java.util.*;
public class WidgetService extends RemoteViewsService {
 public RemoteViewsFactory onGetViewFactory(Intent i){return new RemoteViewsFactory(){List<JSONObject> rows=new ArrayList<>();int id=i.getIntExtra("widget",0);public void onCreate(){onDataSetChanged();}public void onDataSetChanged(){try{rows=TodoWidget.items(WidgetService.this,id);}catch(Exception e){rows=new ArrayList<>();}}public void onDestroy(){}public int getCount(){return rows.size();}public RemoteViews getViewAt(int n){return n<rows.size()?TodoWidget.row(WidgetService.this,rows.get(n),n):null;}public RemoteViews getLoadingView(){return null;}public int getViewTypeCount(){return 2;}public long getItemId(int n){return n;}public boolean hasStableIds(){return false;}};}
}
