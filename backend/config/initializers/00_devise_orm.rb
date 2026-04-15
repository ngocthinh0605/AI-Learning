# Explicitly configure Devise ORM mapping before any models load.
# Prefixed with 00_ so it runs before devise.rb initializer.
# This ensures `devise` macro is available on ActiveRecord models
# when routes.rb is evaluated during db:migrate tasks.
require "devise/orm/active_record"
