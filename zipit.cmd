set EXCLUDELIST=zipexclude.txt
set TEMPDIR=c:\tmpTC
SET INSTALL_DIR=%~dp0
set FILETOZIP=%INSTALL_DIR%.
set PACKAGE=%INSTALL_DIR%package.zip

rmdir %TEMPDIR% /s /q
mkdir %TEMPDIR%
del %PACKAGE%
xcopy %FILETOZIP% %TEMPDIR% /e /i /h /EXCLUDE:%EXCLUDELIST%
CScript zip.vbs  %TEMPDIR% %PACKAGE%
rmdir %TEMPDIR% /s /q
