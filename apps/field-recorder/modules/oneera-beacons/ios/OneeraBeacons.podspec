Pod::Spec.new do |s|
  s.name           = 'OneeraBeacons'
  s.version        = '0.1.0'
  s.summary        = 'Ranging iBeacon pour ONEERA'
  s.author         = 'ONEERA'
  s.homepage       = 'https://oneera.fr'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
