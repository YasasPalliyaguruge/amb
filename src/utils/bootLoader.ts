export function dismissInitialBootLoader() {
  const bootLoader = document.getElementById('initial-boot-loader');

  if (!bootLoader || bootLoader.dataset.dismissed === 'true') {
    return;
  }

  bootLoader.dataset.dismissed = 'true';
  document.documentElement.classList.add('app-boot-loader-dismissed');

  window.setTimeout(() => {
    bootLoader.remove();
  }, 650);
}
