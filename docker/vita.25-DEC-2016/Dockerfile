FROM jreeme/vita:25-DEC-2016

RUN DEBIAN_FRONTEND=noninteractive apt-get install wireshark -y
RUN apt-get install -y bro

#
# Create some folders to mount
#
RUN mkdir -p /home/vita/config
RUN mkdir -p /home/vita/input-data
RUN mkdir -p /home/vita/output-data

