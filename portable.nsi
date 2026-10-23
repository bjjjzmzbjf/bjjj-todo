Unicode true
Name "不急及及代办 · bjjj todo"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "bjjj todo"
VIAddVersionKey "FileDescription" "不急及及代办"
VIAddVersionKey "ProductVersion" "1.0.0"
VIAddVersionKey "FileVersion" "1.0.0.0"
OutFile "${__FILEDIR__}\release\bjjj todo.exe"
Icon "${__FILEDIR__}\icon.ico"
RequestExecutionLevel user
SilentInstall silent
SetCompressor zlib
SetDatablockOptimize off
Section
 InitPluginsDir
 SetOutPath "$PLUGINSDIR\app"
 File /r "${__FILEDIR__}\release\win-unpacked\*.*"
 System::Call 'kernel32::SetEnvironmentVariable(t "PORTABLE_EXECUTABLE_FILE", t "$EXEPATH") i .r0'
 ExecWait '"$PLUGINSDIR\app\bjjj todo.exe"'
SectionEnd
