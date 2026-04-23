/**
 * electron-builder afterSign hook. Notarizes the macOS .app when Apple credentials are present.
 * Required env for notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
 * (see https://github.com/electron/notarize#usage)
 */
module.exports = async function notarizeHook(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }
  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_APP_SPECIFIC_PASSWORD ||
    !process.env.APPLE_TEAM_ID
  ) {
    console.log(
      '[notarize] Skipping: set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID to enable notarization.',
    );
    return;
  }

  const { notarize } = await import('@electron/notarize');
  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;

  console.log('[notarize] Submitting', appPath);
  await notarize({
    appBundleId: context.packager.appInfo.appId,
    tool: 'notarytool',
    appPath,
    teamId: process.env.APPLE_TEAM_ID,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
  });
  console.log('[notarize] Done.');
};
