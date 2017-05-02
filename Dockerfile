FROM krlmlr/debian-ssh:jessie
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get remove apt-listchanges
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN mkdir /src 
RUN mkdir /src/sitecheck 
WORKDIR /src/sitecheck
COPY . /src/sitecheck/ 
EXPOSE 3000
