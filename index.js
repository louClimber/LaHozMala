/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    (data.linkHotspots || []).forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    (data.infoHotspots || []).forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create dron hotspots.
    (data.dronHotspots || []).forEach(function(hotspot) {
      var element = createDronHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create web hotspots.
    (data.webHotspots || []).forEach(function(hotspot) {
      var element = createWeblupaHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create home hotspots.
    (data.homeHotspots || []).forEach(function(hotspot) {
      var element = createHomeHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create video hotspots.
    (data.videoHotspots || []).forEach(function(hotspot) {
      var element = createVideoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create image hotspots.
    (data.imageHotspots || []).forEach(function(hotspot) {
      var element = createImageHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {

  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('link-hotspot');

  var icon = document.createElement('img');
  icon.src = 'img/link.png';
  icon.classList.add('link-hotspot-icon');

  var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
  for (var i = 0; i < transformProperties.length; i++) {
    var property = transformProperties[i];
    icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
  }

  wrapper.addEventListener('click', function() {
    switchScene(findSceneById(hotspot.target));
  });

  stopTouchAndScrollEventPropagation(wrapper);

  var textBox = document.createElement('div');
  textBox.classList.add('link-hotspot-textbox');
  textBox.textContent = hotspot.title || findSceneDataById(hotspot.target).name;

  wrapper.appendChild(icon);
  wrapper.appendChild(textBox);

  return wrapper;
}

  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function createDronHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('dron-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/dron.png';
    icon.classList.add('dron-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('dron-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createWeblupaHotspotElement(hotspot) {

      // Outer wrapper
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('web-hotspot');

  // Clickable header link
  var header = document.createElement('a');
  header.classList.add('web-hotspot-header');
  header.href = hotspot.url;
  header.target = '_blank';
  header.rel = 'noopener noreferrer';
  header.title = hotspot.title || 'Open website';

  // Icon
  var iconWrapper = document.createElement('div');
  iconWrapper.classList.add('web-hotspot-icon-wrapper');

  var icon = document.createElement('img');
  icon.src = 'img/lupa.png';
  icon.classList.add('web-hotspot-icon');
  iconWrapper.appendChild(icon);

  // Title
  var titleWrapper = document.createElement('div');
  titleWrapper.classList.add('web-hotspot-title-wrapper');

  var title = document.createElement('div');
  title.classList.add('web-hotspot-title');
  title.innerHTML = hotspot.title || '';
  titleWrapper.appendChild(title);

  // Build element
  header.appendChild(iconWrapper);
  header.appendChild(titleWrapper);
  wrapper.appendChild(header);

  // Prevent panorama drag from interfering
  stopTouchAndScrollEventPropagation(wrapper);

  return wrapper;
}

function createHomeHotspotElement(hotspot) {

      // Outer wrapper
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('home-hotspot');

  // Clickable header link
  var header = document.createElement('a');
  header.classList.add('home-hotspot-header');
  header.href = hotspot.url;
  header.target = '_blank';
  header.rel = 'noopener noreferrer';
  header.title = hotspot.title || 'Open website';

  // Icon
  var iconWrapper = document.createElement('div');
  iconWrapper.classList.add('home-hotspot-icon-wrapper');

  var icon = document.createElement('img');
  icon.src = 'img/home.png';
  icon.classList.add('home-hotspot-icon');
  iconWrapper.appendChild(icon);

  // Title
  var titleWrapper = document.createElement('div');
  titleWrapper.classList.add('home-hotspot-title-wrapper');

  var title = document.createElement('div');
  title.classList.add('home-hotspot-title');
  title.innerHTML = hotspot.title || '';
  titleWrapper.appendChild(title);

  // Build element
  header.appendChild(iconWrapper);
  header.appendChild(titleWrapper);
  wrapper.appendChild(header);

  // Prevent panorama drag from interfering
  stopTouchAndScrollEventPropagation(wrapper);

  return wrapper;
}

function createVideoHotspotElement(hotspot) {
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('video-hotspot');

  var button = document.createElement('div');
  button.classList.add('video-hotspot-button');

  var icon = document.createElement('img');
  icon.src = hotspot.icon || 'img/uligif.gif';
  icon.classList.add('video-hotspot-icon');

  button.appendChild(icon);
  wrapper.appendChild(button);

  var modal = document.createElement('div');
  modal.classList.add('video-hotspot-modal');

  var modalContent = document.createElement('div');
  modalContent.classList.add('video-hotspot-modal-content');

  var close = document.createElement('div');
  close.classList.add('video-hotspot-close');
  close.innerHTML = '&times;';

  var modalTitle = document.createElement('div');
  modalTitle.classList.add('video-hotspot-popup-title');
  modalTitle.textContent = hotspot.title || '';

  var iframeWrapper = document.createElement('div');
  iframeWrapper.classList.add('video-hotspot-iframe-wrapper');

  var iframe = document.createElement('iframe');
  iframe.classList.add('video-hotspot-iframe');
  iframe.src = '';
  iframe.width = '560';
  iframe.height = '315';
  iframe.title = hotspot.title || 'YouTube video player';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.setAttribute('allowfullscreen', '');

  iframeWrapper.appendChild(iframe);
  modalContent.appendChild(close);
  modalContent.appendChild(modalTitle);
  modalContent.appendChild(iframeWrapper);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  function openModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    iframe.src = hotspot.videoEmbed || '';
    modal.classList.add('visible');
  }

  function closeModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    modal.classList.remove('visible');
    iframe.src = '';
  }

  button.addEventListener('click', openModal);
  button.addEventListener('touchstart', openModal, { passive: false });

  close.addEventListener('click', closeModal);
  close.addEventListener('touchstart', closeModal, { passive: false });

  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal(event);
    }
  });

  stopTouchAndScrollEventPropagation(wrapper);

  return wrapper;
}

function createImageHotspotElement(hotspot) {
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('image-hotspot');

  var button = document.createElement('div');
  button.classList.add('image-hotspot-button');

  var icon = document.createElement('img');
  icon.src = hotspot.icon || 'img/image.png';
  icon.classList.add('image-hotspot-icon');

  var title = document.createElement('div');
  title.classList.add('image-hotspot-title');
  title.textContent = hotspot.title || '';

  button.appendChild(icon);
  button.appendChild(title);
  wrapper.appendChild(button);

  var modal = document.createElement('div');
  modal.classList.add('image-hotspot-modal');

  var modalContent = document.createElement('div');
  modalContent.classList.add('image-hotspot-modal-content');

  var close = document.createElement('div');
  close.classList.add('image-hotspot-close');
  close.innerHTML = '&times;';

  var modalTitle = document.createElement('div');
  modalTitle.classList.add('image-hotspot-popup-title');
  modalTitle.textContent = hotspot.title || '';

  var image = document.createElement('img');
  image.classList.add('image-hotspot-popup-image');
  image.src = hotspot.image;
  image.alt = hotspot.title || 'Image';

  modalContent.appendChild(close);
  modalContent.appendChild(modalTitle);
  modalContent.appendChild(image);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  function openModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    modal.classList.add('visible');
  }

  function closeModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    modal.classList.remove('visible');
  }

  button.addEventListener('click', openModal);
  button.addEventListener('touchstart', openModal, { passive: false });

  close.addEventListener('click', closeModal);
  close.addEventListener('touchstart', closeModal, { passive: false });

  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal(event);
    }
  });

  stopTouchAndScrollEventPropagation(wrapper);

  return wrapper;
}

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Display the initial scene.
  switchScene(scenes[0]);

})();
