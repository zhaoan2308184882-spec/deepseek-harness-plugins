!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!ifndef BUILD_UNINSTALLER

Var HarnessDirectoryText

Function NormalizeHarnessInstallDirectory
  ; Remove one trailing slash so GetFileName can inspect the selected folder.
  StrCpy $0 $INSTDIR 1 -1
  ${If} $0 == "\"
    StrCpy $INSTDIR $INSTDIR -1
  ${EndIf}

  ${GetFileName} "$INSTDIR" $1
  StrCmp $1 "harness-desktop" done
  StrCpy $INSTDIR "$INSTDIR\harness-desktop"

  done:
FunctionEnd

Function HarnessDirectoryPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  Call NormalizeHarnessInstallDirectory

  ${NSD_CreateLabel} 0 0 100% 24u "请选择安装位置。选择父目录后会自动添加 harness-desktop。"
  Pop $0

  ${NSD_CreateLabel} 0 42u 100% 12u "目标文件夹"
  Pop $0

  ${NSD_CreateText} 0 58u 76% 14u "$INSTDIR"
  Pop $HarnessDirectoryText

  ${NSD_CreateButton} 79% 56u 21% 18u "浏览(&B)..."
  Pop $0
  ${NSD_OnClick} $0 HarnessDirectoryBrowse

  ${NSD_CreateLabel} 0 90u 100% 26u "示例：选择 E:\deepseek-harness，最终安装到 E:\deepseek-harness\harness-desktop。"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function HarnessDirectoryBrowse
  nsDialogs::SelectFolderDialog "选择安装父目录" "$INSTDIR"
  Pop $0
  ${If} $0 == error
    Return
  ${EndIf}

  StrCpy $INSTDIR $0
  Call NormalizeHarnessInstallDirectory
  ${NSD_SetText} $HarnessDirectoryText "$INSTDIR"
FunctionEnd

Function HarnessDirectoryPageLeave
  ${NSD_GetText} $HarnessDirectoryText $INSTDIR
  Call NormalizeHarnessInstallDirectory
FunctionEnd

!macro customPageAfterChangeDir
  Page custom HarnessDirectoryPageCreate HarnessDirectoryPageLeave
!macroend

!endif
