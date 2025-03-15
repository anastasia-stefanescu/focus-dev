https://github.com/snowplow/snowplow-docker.git

https://dev.to/lazypro/building-a-snowplow-playground-127

https://github.com/pacuna/snowplow-pipeline -> clone this, after do:
docker compose up -data

## The pipeline works in the following way:

    1. A request is sent to the Scala Collector
    # The collector runs as a web service specified on the following interface and port.
        interface = "0.0.0.0"
        port = 8080
    2. The raw event (thift event) is put into the snowplow_raw_good (or bad) topic
    3. The enricher grabs the raw events, parses them and put them into the snowplow_parsed_good (or bad) topic
    4. A custom events processor grabs the parsed event, which is in a tab-delimited/json hybrid format and turns it into a proper Json event using the python analytics SDK from Snowplow. This event is then put into a final topic called snowplow_json_event.
    5. (WIP) A custom script grabs the final Json events and loads them into some storage solution (such as BigQuery or Redshift)

    Set up the infrastructure using:
        docker compose up -d

## Check health:
    curl http://localhost:8080/health

## Send an event:
    curl "http://localhost:8080/i?e=pv&url=http://example.com&aid=myApp&uid=user123"


## Verify topics inside kafka collector container:
    docker exec -it snowplow-pipeline-kafka-1 kafka-topics --bootstrap-server kafka:9092 --list

    docker exec -it snowplow-pipeline-kafka-1 \
    kafka-topics --bootstrap-server kafka:9092 --list
    These should exist: 
        __consumer_offsets
        snowplow_enriched_good
        snowplow_json_event
        snowplow_raw_good


## See messages inside a topic:
        docker exec -it snowplow-pipeline-kafka-1 kafka-console-consumer --bootstrap-server kafka:9092 --topic snowplow_raw_good --from-beginning

    Each block corresponds to an event captured by Snowplow pipeline, encoded in *Thrift* . For example:

        IP Address: 192.168.65.1 (Client IP address making the request).

        User-Agent: curl/8.9.1 (The tool making the request).

        Event Parameters: url=http://example.com&aid=myApp&uid=user123 (Captured event details).

        UUIDs: Unique identifiers for tracking events (e.g., 
        $2f1af86a-720e-478b-940e-0f19fc10dfac).

        Schema: iglu:com.snowplowanalytics.snowplow/CollectorPayload/thrift/1-0-0 – The schema defining the structure of the event.
    
How to view these events in a readable format? Consume enriched events 

## See the snowplow_enriched_good topic:
    docker exec -it snowplow-pipeline-kafka-1 kafka-console-consumer --bootstrap-server kafka:9092 --topic snowplow_enriched_good --from-beginning

## Check Processed Event in snowplow_json_event
    docker exec -it snowplow-pipeline-kafka-1 \
    kafka-console-consumer --bootstrap-server kafka:9092 \
    --topic snowplow_json_event --from-beginning

!!!! If you keep the infrastructure open for too long, it might fail, especially the json part


        
(You don't need to have Kafka installed locally!! But if you want, you can do this:
    Dowload Apache kafka
        https://learn.conduktor.io/kafka/how-to-install-apache-kafka-on-mac/
        Move downloaded folder to users/anastasiastefanescu/

    Ensure you have Java >= 11 installed 

    Go to kafka folder.

    To start  Zookeeper:
        ~/kafka_2.13-3.9.0/bin/zookeeper-server-start.sh ~/kafka_2.13-3.9.0/config/zookeeper.properties
    *You can use the -daemon flag to run Zookeeper in daemon mode in the background

    To start Apache Kafka:
        ~/kafka_2.13-3.9.0/bin/kafka-server-start.sh ~/kafka_2.13-3.9.0/config/server.properties

    !Ensure to keep both terminal windows opened, otherwise you will shut down Kafka or Zookeeper!

    Setup the $PATH environment variable
        nano ~/.zshrc
        Add to the end of the file:
            export PATH="$PATH:/Users/anastasiastefanescu/kafka_2.13-3.9.0/bin"
        source ~/.zshrc
        You can start this way from any folder:
            kafka-topics.sh 
)
