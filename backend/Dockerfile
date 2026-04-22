FROM ruby:3.2.2-slim

RUN apt-get update -qq && apt-get install -y \
  build-essential \
  libpq-dev \
  nodejs \
  postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Reason: install exactly what Gemfile.lock pins. Copying only Gemfile made the image
# disagree with the mounted repo's lockfile → Bundler::GemNotFound at runtime.
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

COPY . .

EXPOSE 3001

ENTRYPOINT ["bin/docker-entrypoint"]
